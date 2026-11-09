# 자연어 조건 추출 — 미확정 제안 단계

`app/agent/extraction.py`의 extract_proposal(model, message)는 Gemini 구조화 JSON 출력으로
가격 상한, 카테고리, 정렬과 원문 근거(evidence), 미해결 조건(unresolved)을 반환한다.
DB 조회나 추천을 실행하지 않으며 SearchFilters로 자동 변환하지 않는다.
사용자 확인 흐름과 HTTP 연결은 CONFIRMATION_FLOW.md에 구현되어 있다. 기존 추천 API는 확정 조건을 계속 요구한다.

지원: 정수 원화 최대 가격(이하/미만), COFFEE/LATTE/TEA/ETC, price/distance.
미언급 값은 null. 거리순은 위치 확인 필요. 단맛/디카페인/목적/특정 메뉴명 등
보존할 수 없는 요청은 미해결 조건으로 남기도록 지시한다.
서버는 타입·허용값·음수·원문 근거 유무·도구 호출 금지를 검증한다.
원문 근거가 있다는 것만으로 의미 해석의 정확성을 보장하지 않으므로 사용자 확인은 필수다.
미해결 조건이 없다는 모델 응답도 모든 조건을 인식했다는 보장은 아니다.

## 실행과 평가

노트북 agent_api_smoke.ipynb 6절: 커널 재시작 → 첫 준비 셀 → 추출 셀.
RUN_EXTRACTION=True로 개별 문장, RUN_EXTRACTION_EVALUATION=True로 5개 문장 평가.
CLI: ai-server에서 `.venv/Scripts/python.exe scripts/evaluate_extraction.py` (실제 API 사용).

2026-11-09 최종 실제 평가 5/5:
- 4천 원 이하 커피 가격순 → 4000 / COFFEE / price
- 5천 원 미만 라떼 → 4999 / LATTE / null
- 차 가격순 → null / TEA / price
- 근처 달지 않은 커피 거리순 → 단맛·위치 확인 항목
- 공부 목적 디카페인 라떼 → 목적·디카페인 확인 항목

초기 호출에서 JSON 코드 블록, 이하/미만 혼동, 불필요한 질문을 발견했다.
명시적 JSON 스키마와 한국어 지시문으로 보강한 후 위 결과를 확인했다.
자동 테스트 57개 통과. 5개 예시 통과는 일반적인 한국어 해석 정확도의 보장이 아니다.
