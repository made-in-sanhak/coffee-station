"""Small repeatable evaluation. Offline by default; --live uses Gemini quota."""
import argparse
from dataclasses import dataclass
import json
from pathlib import Path
import sys

AI_ROOT = Path(__file__).resolve().parents[1]
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from app.agent.loop import run_turn
from app.llm.base import Reply, ScriptedModel, ToolCall
from app.llm.diagnostics import diagnose_model_error
from app.repositories.base import SearchFilters
from app.repositories.mock import MockRepository


@dataclass(frozen=True)
class Scenario:
    id: str
    message: str
    filters: SearchFilters
    expected: frozenset[str]
    arguments: dict


SCENARIOS = (
    Scenario('coffee_4000', '4000원 이하 COFFEE 메뉴를 빠짐없이 모두 찾아줘.',
             SearchFilters(max_price_krw=4000, category='COFFEE', sort_by='price'),
             frozenset({'m1', 'm4', 'm5'}), {'max_price_krw': 4000, 'category': 'COFFEE'}),
    Scenario('coffee_3500', '3500원 이하 COFFEE 메뉴를 빠짐없이 모두 찾아줘.',
             SearchFilters(max_price_krw=3500, category='COFFEE', sort_by='price'),
             frozenset({'m1', 'm4'}), {'max_price_krw': 3500, 'category': 'COFFEE'}),
    Scenario('tea_4000', '4000원 이하 TEA 메뉴를 빠짐없이 모두 찾아줘.',
             SearchFilters(max_price_krw=4000, category='TEA', sort_by='price'),
             frozenset({'m6'}), {'max_price_krw': 4000, 'category': 'TEA'}),
    Scenario('no_match', '1000원 이하 COFFEE 메뉴를 찾아줘. 없으면 없다고 알려줘. 예산을 임의로 늘리지 마.',
             SearchFilters(max_price_krw=1000, category='COFFEE', sort_by='price'),
             frozenset(), {'max_price_krw': 1000, 'category': 'COFFEE'}),
)


def assess(scenario, result):
    actual = {m.offer.id for m in result.recommendations}
    searched = any(e.get('tool') == 'search_menus' and e.get('status') == 'ok'
                   for e in result.trace)
    status_ok = result.status == 'RESULT' or (not scenario.expected and result.status == 'QUESTION')
    constraints_ok = all(m.offer.price_krw is not None
                         and m.offer.price_krw <= scenario.filters.max_price_krw
                         and m.offer.category == scenario.filters.category
                         and m.offer.evidence.is_mock for m in result.recommendations)
    passed = searched and status_ok and constraints_ok and actual == scenario.expected
    return {'scenario': scenario.id, 'passed': passed, 'status': result.status,
            'searched': searched, 'constraints_ok': constraints_ok,
            'expected_ids': sorted(scenario.expected), 'actual_ids': sorted(actual),
            'llm_calls': result.llm_calls, 'elapsed_ms': result.elapsed_ms,
            'errors': [e for e in result.trace if e.get('event') == 'model_error'],
            'invalid_tool_calls': sum(e.get('code') == 'INVALID_TOOL_CALL' for e in result.trace)}


def evaluate(live=False, selected='all'):
    repo = MockRepository(AI_ROOT / 'fixtures/api_smoke_catalog.json')
    scenarios = [s for s in SCENARIOS if selected in ('all', s.id)]
    if not scenarios:
        raise ValueError('Unknown scenario')
    client = None
    rows = []
    try:
        if live:
            from app.llm.settings import read_gemini_settings
            from app.llm.gemini import GeminiModel
            key, model_id = read_gemini_settings(AI_ROOT)
            client = GeminiModel(api_key=key, model=model_id)
        for scenario in scenarios:
            model = client if live else ScriptedModel([
                Reply(calls=(ToolCall('search_menus', scenario.arguments),)),
                Reply(text=json.dumps({'type': 'RESULT', 'offer_ids': sorted(scenario.expected)})),
            ])
            print('Running:', scenario.id, 'LIVE' if live else 'OFFLINE', flush=True)
            result = run_turn(model, repo, scenario.message, constraints=scenario.filters,
                              max_llm_calls=3, max_tool_calls=3, timeout_s=60)
            row = assess(scenario, result)
            rows.append(row)
            print(json.dumps(row, ensure_ascii=False), flush=True)
            # Do not spend more quota when a provider/environment failure occurs.
            if result.status == 'ERROR':
                break
    finally:
        if client is not None:
            client.close()
    return {'mode': 'live' if live else 'offline', 'requested': len(scenarios),
            'completed': len(rows), 'passed': sum(r['passed'] for r in rows), 'results': rows}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live', action='store_true')
    parser.add_argument('--scenario', choices=['all'] + [s.id for s in SCENARIOS], default='all')
    args = parser.parse_args()
    try:
        summary = evaluate(args.live, args.scenario)
    except Exception as error:
        print(diagnose_model_error(error)[1])
        return 1
    print('Summary:', summary['passed'], '/', summary['requested'], summary['mode'])
    return 0 if summary['passed'] == summary['requested'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
