"""Live extraction only; no DB access and no recommendation execution."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.agent.extraction import extract_proposal
from app.llm.gemini import GeminiModel
from app.llm.settings import read_gemini_settings


CASES = (
    ('4천 원 이하 커피를 저렴한 순으로 추천해줘.', (4000, 'COFFEE', 'price'), False),
    ('5천 원 미만 라떼를 추천해줘.', (4999, 'LATTE', None), False),
    ('차를 저렴한 순으로 찾아줘.', (None, 'TEA', 'price'), False),
    ('근처에서 달지 않은 커피를 가까운 순으로 찾아줘.', (None, 'COFFEE', 'distance'), True),
    ('공부하기 좋은 카페에서 디카페인 라떼 추천해줘.', (None, 'LATTE', None), True),
)


def evaluate():
    key, name = read_gemini_settings(ROOT)
    model = GeminiModel(api_key=key, model=name)
    passed = 0
    try:
        for message, expected, needs_clarification in CASES:
            result = extract_proposal(model, message)
            actual = (result.max_price_krw, result.category, result.sort_by)
            good = actual == expected and bool(result.unresolved) == needs_clarification
            print('PASS' if good else 'FAIL', message, flush=True)
            print(result.model_dump_json(indent=2), flush=True)
            passed += good
    finally:
        model.close()
    print(f'Extraction: {passed}/{len(CASES)}; all proposals remain unconfirmed')
    return passed == len(CASES)


if __name__ == '__main__':
    raise SystemExit(0 if evaluate() else 1)
