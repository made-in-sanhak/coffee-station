# 추천 HTTP API

`POST /recommendations`는 Express가 호출할 Python 내부 API다.
`X-Internal-Token` 헤더에 서버의 INTERNAL_API_TOKEN을 전달한다.
API 키·DB 선택·조회 매장 범위는 서버에서 관리한다.

## 실행

ai-server/.env에 기존 Gemini/DB 설정과 INTERNAL_API_TOKEN을 설정한다.
데모는 AGENT_REPOSITORY=mysql-demo, AGENT_CAFE_IDS=990001을 사용한다.
기본값은 mock, 실제 데이터는 mysql로 선택한다. 설정 변경 후 서버를 재시작한다.

ai-server에서 실행:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

요청 본문:

```json
{
  "message": "4000원 이하 COFFEE 메뉴를 모두 찾아줘.",
  "constraints": {
    "max_price_krw": 4000,
    "category": "COFFEE",
    "sort_by": "price",
    "limit": 20
  }
}
```

constraints는 필수다. 자연어만으로 필수 조건을 자동 확정하지 않는다.
지원 필드는 max_price_krw, category, origin:{lat,lng}, radius_m, sort_by(price/distance), limit이다.
거리 조건/정렬에는 origin이 필요하다. 지원하지 않는 필드는 422로 거절한다.
메시지와 확정 조건은 호출자가 일치시켜야 한다. 취향·리뷰 점수와 대화 세션은 아직 미구현이다.
추천 원칙은 RECOMMENDATION_POLICY.md를 따른다.

응답: status, message, recommendations, trace, llm_calls, elapsed_ms.
recommendations에는 cafe, offer, distance_m이 들어가며 날짜는 ISO 문자열이다.
HTTP 200은 RESULT 또는 QUESTION, 인증 실패 401, 입력 오류 422,
설정/DB 초기화 실패 503, Agent 실행 오류 502, 실행 제한 504다.
오류 응답은 자동 재시도하지 말고 상태를 확인한다. /health는 프로세스 상태만 확인한다.
전체 요청 시간에는 DB 초기화 시간이 추가되므로 호출 측 제한 시간을 여유 있게 설정한다.

## 검증

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests
.\.venv\Scripts\python.exe scripts/check_recommendation_http.py
```

두 번째 명령은 실제 Gemini 할당량을 사용한다. Docker 데모 DB와 시드가 필요하다.
18081 포트에 서버를 띄우고 임시 인증 토큰으로 요청한 뒤 서버를 종료한다.
2026-11-09 실제 HTTP 200/RESULT 확인: 모델 2회, search_menus 1회,
992004(3000원), 992001(3500원), 992005(4000원) 일치.

## Express 연결

클라이언트는 `POST /api/recommendations`에 위와 동일한 본문을 보낸다.
Express는 AI_SERVER_URL(기본 http://127.0.0.1:8000)과 INTERNAL_API_TOKEN을
서버 설정에서 읽고 Python에 요청한다. 클라이언트에는 내부 토큰을 전달하지 않는다.
성공 응답은 기존 규격 `{success:true, data: <Python 응답>, message:null}`이다.
입력 오류는 422, 서비스 연결 실패는 502, 설정/DB 불가는 503, 시간 초과는 504다.
Express 요청 제한은 90초이며 자동 재시도하지 않는다.
현재 저장소에는 사용자 인증 미들웨어가 없다. 이번 연결은 로컬 개발용이며,
외부 공개 전에 사용자 인증과 요청 제한을 추가해야 한다.

수동 실행은 backend에서 `npm run dev`, ai-server에서 위 uvicorn 명령을 사용한다.
Express와 Python의 INTERNAL_API_TOKEN을 같게 설정한다.
프로젝트 루트 .env를 공통 사용하거나 각 프로세스에 환경변수로 주입한다.

노트북 `notebooks/agent_api_smoke.ipynb`의 첫 준비 셀과 **4. 통합 테스트**를 실행하면 된다.
4절의 DB 확인 셀은 API 비용이 없고, RUN_HTTP_TEST=True인 셀은 실제 Gemini를 호출한다.
자동 통합 테스트는 임시 토큰/로컬 서버를 사용하므로 기존 토큰 설정을 변경하지 않는다.

CLI 재검증: backend에서 `npm run build` 후 ai-server에서
` .\.venv\Scripts\python.exe scripts/check_recommendation_http.py --express`.
Express 오류 테스트: backend에서 `node --test tests/recommendations.cjs` (build 선행).
2026-11-09 노트북 실제 실행으로 Express → Python → Gemini → 데모 MySQL 왕복 통과.

## 경계 조건 평가 (2026-11-09)

`scripts/check_recommendation_http.py --express --cases` 실제 실행 결과:

| 예산 | 실제 상태 | 메뉴 수 | 판정 |
|---|---|---|---|
| 4000원 | RESULT | 3 | PASS: 4000원 포함 |
| 3999원 | RESULT | 2 | PASS: 4000원 제외 |
| 2999원 | QUESTION | 0 | PASS: 조건 자동 완화 없음 |

각 시나리오 모델 2회, 총 6회 호출. 모든 요청은 HTTP 200.
이는 질문 처리가 성공한 경우도 포함하며 QUESTION을 추천 완료로 표시하면 안 된다.
자동 테스트 53개 통과. HTTP 경계값/빈 결과/거리순/조건 완화 차단/모델 오류·실행 제한을 추가 검증했다.
DB 오류·모델 오류는 모의 장애, 거리순은 서로 다른 좌표의 메모리 매장 2개를 사용했다.
실제 DB를 중단하거나 외부 API 장애를 유발하지 않았다.
노트북 5절에서 자동 테스트와 선택적 실제 시나리오 검증을 재실행할 수 있다.
개인화·자연어 조건 자동 확정·실제 다중 매장 거리 품질은 이번 평가 범위가 아니다.
