"""Live Gemini + demo DB HTTP check. Starts and stops its own local server."""
import os
import argparse
import shutil
import socket
from pathlib import Path
import secrets
import subprocess
import sys
import time

import httpx


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--express', action='store_true', help='Test via built Express server')
    parser.add_argument('--cases', action='store_true', help='Also check 3999 KRW and no matches')
    parser.add_argument('--confirm', action='store_true', help='Automated prepare/confirm test')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    # Refuse occupied ports so the test cannot accidentally target another server.
    for port in ([18081, 18082] if args.express else [18081]):
        with socket.socket() as probe:
            probe.bind(('127.0.0.1', port))
    token = secrets.token_urlsafe(32)
    env = {**os.environ, 'INTERNAL_API_TOKEN': token,
           'AGENT_REPOSITORY': 'mysql-demo', 'AGENT_CAFE_IDS': '990001'}
    process = subprocess.Popen(
        [sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '18081'],
        cwd=root, env=env,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    processes = [process]
    try:
        if args.express:
            if not (root.parent / 'backend/dist/server.js').is_file():
                raise RuntimeError('Run npm run build in backend first')
            node = shutil.which('node')
            if not node:
                raise RuntimeError('Node.js is required')
            processes.append(subprocess.Popen([node, 'dist/server.js'], cwd=root.parent / 'backend',
                env={**env, 'PORT': '18082', 'HOST': '127.0.0.1', 'AI_SERVER_URL': 'http://127.0.0.1:18081'},
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
        with httpx.Client(timeout=100, trust_env=False) as client:
            for _ in range(50):
                if any(p.poll() is not None for p in processes):
                    raise RuntimeError('Test server failed to start; check ports 18081/18082')
                try:
                    ready = client.get('http://127.0.0.1:18081/health').status_code == 200
                    if args.express:
                        ready = ready and client.get('http://127.0.0.1:18082/__ready').status_code == 404
                    if ready:
                        break
                except httpx.ConnectError:
                    pass
                time.sleep(0.2)
            else:
                raise RuntimeError('Test server startup timed out')
            url = 'http://127.0.0.1:18082/api/recommendations' if args.express else 'http://127.0.0.1:18081/recommendations'
            cases = [(4000, ['992004', '992001', '992005'])]
            if args.cases:
                cases += [(3999, ['992004', '992001']), (2999, [])]
            for budget, expected in cases:
                print('Case budget:', budget, flush=True)
                endpoint = url
                payload = {'message': f'{budget}원 이하 COFFEE 메뉴를 모두 찾아줘.',
                           'constraints': {'max_price_krw': budget, 'category': 'COFFEE', 'sort_by': 'price'}}
                if args.confirm:
                    prepared = client.post(url + '/prepare', headers={} if args.express else {'X-Internal-Token': token},
                        json={'message': f'{budget}원 이하 커피를 저렴한 순으로 추천해줘.'})
                    assert prepared.status_code == 200, prepared.status_code
                    proposal = prepared.json()['data'] if args.express else prepared.json()
                    assert proposal['status'] == 'AWAITING_CONFIRMATION', proposal
                    assert proposal['suggested_constraints']['max_price_krw'] == budget
                    assert proposal['suggested_constraints']['category'] == 'COFFEE'
                    print('Prepare: PASS (automated test confirmation)', flush=True)
                    endpoint = url + '/confirm'
                    payload = {'proposal_id': proposal['proposal_id'], 'confirmed': True,
                               'constraints': proposal['suggested_constraints']}
                response = client.post(endpoint, headers={} if args.express else {'X-Internal-Token': token},
                    json=payload)
                data = response.json()
                if args.express:
                    assert response.status_code == 200 and data.get('success'), data.get('message')
                    data = data['data']
                print('HTTP:', response.status_code, 'status:', data.get('status'))
                print('Trace:', data.get('trace'))
                print('Recommendation LLM calls:', data.get('llm_calls'))
                ids = [m['offer']['id'] for m in data.get('recommendations', [])]
                assert response.status_code == 200 and data['status'] in (('RESULT',) if expected else ('RESULT', 'QUESTION')), data.get('message')
                assert ids == expected, ids
                assert any(e.get('tool') == 'search_menus' and e.get('status') == 'ok' for e in data['trace'])
                assert all(m['offer']['price_krw'] <= budget for m in data['recommendations'])
                assert all(m['offer']['evidence']['is_mock'] for m in data['recommendations'])
                for match in data['recommendations']:
                    print(match['offer']['name'], match['offer']['price_krw'])
                print('PASS:', 'Express ->' if args.express else '', 'Python -> MySQL demo -> result;' if data.get('llm_calls') == 0 else 'Python -> Gemini -> MySQL demo -> Gemini;', ids)
    finally:
        for child in reversed(processes):
            child.terminate()
            try:
                child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()


if __name__ == '__main__':
    main()
