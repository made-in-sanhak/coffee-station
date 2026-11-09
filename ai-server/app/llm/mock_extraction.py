"""Explicit fixtures, not a natural-language interpreter or fallback."""
import json
from app.llm.base import Reply, ScriptedModel

MESSAGES = (
    '4천 원 이하 커피를 저렴한 순으로 추천해줘.',
    '5천 원 미만 라떼를 추천해줘.',
    '근처에서 달지 않은 커피를 가까운 순으로 찾아줘.',
)


class MockExtractionModel(ScriptedModel):
    def __init__(self, message):
        values = dict(max_price_krw=None, category=None, sort_by=None, evidence={}, unresolved=[])
        if message == MESSAGES[0]:
            values.update(max_price_krw=4000, category='COFFEE', sort_by='price',
                evidence={'max_price_krw': '4천 원 이하', 'category': '커피', 'sort_by': '저렴한 순'})
        elif message == MESSAGES[1]:
            values.update(max_price_krw=4999, category='LATTE',
                evidence={'max_price_krw': '5천 원 미만', 'category': '라떼'})
        elif message == MESSAGES[2]:
            values.update(category='COFFEE', sort_by='distance',
                evidence={'category': '커피', 'sort_by': '가까운 순'},
                unresolved=['단맛 정보가 없습니다.', '현재 위치와 검색 반경을 확인하세요.'])
        else:
            values['unresolved'] = ['모의 모드에 등록되지 않은 문장입니다. 지원 문장을 사용하거나 Gemini 모드로 변경하세요.']
        super().__init__([Reply(text=json.dumps(values, ensure_ascii=False))])

    def close(self):
        pass
