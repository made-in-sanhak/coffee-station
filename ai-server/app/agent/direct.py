"""Confirmed filters only; no language interpretation or model calls."""
from dataclasses import replace
from time import monotonic
from app.agent.state import AgentResult


def recommend_direct(repo, constraints):
    start = monotonic()
    # Exclude unknown prices before applying the presentation limit.
    matches = repo.search_menus(replace(constraints, limit=100))
    selected = tuple(m for m in matches if m.offer.price_krw is not None)[:constraints.limit]
    if not selected:
        status = 'QUESTION'
        message = '조건에 맞는 메뉴가 없습니다. 검색 조건을 변경할까요?'
    else:
        status = 'RESULT'
        message = '임시 데이터 기반 추천입니다.' if any(
            m.offer.evidence.is_mock or m.cafe.evidence.is_mock for m in selected
        ) else '조회 데이터 기반 추천입니다.'
    elapsed = round((monotonic() - start) * 1000, 2)
    return AgentResult(status, message, selected,
        [{'event': 'tool', 'tool': 'search_menus', 'status': 'ok',
          'result_count': len(selected), 'elapsed_ms': elapsed, 'mode': 'direct'}], 0, elapsed)
