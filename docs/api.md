# 앱 ↔ Express API 안내

> 현재 구현 안내. 제품 목표 API 초안은 `산학프로젝트/최신 문서/커피 주유소 · API 명세서`에 있다. 문서별 역할은 [문서 안내](README.md) 참조.

현재 구현된 AI 경로와 요청·응답은 [실시간 추천](ai-recommendation.md)을 따른다. 공통 성공 응답은 `{"success":true,"data":{},"message":null}`이다. `/health`는 서버·DB 상태를 보고한다.

인증, 카페·메뉴, 구매, OCR 등 전체 제품 API 명세는 팀 계약 확정 후 추가한다. 구현되지 않은 경로를 현재 API로 표시하지 않는다.

## 개발용 추천 탭 경로 (2026-11-11)

현재 Express 접두사는 `/api/recommendations`이며 `/api/v1` 제품 명세와 다르다. `NODE_ENV=production`에서는 모든 추천 경로가 503으로 차단된다. `MVP_CATALOG_MODE=mysql-seed`에서 행신 DEMO 가격만 조회한다.

| 경로 | 요청 | 처리 |
| --- | --- | --- |
| `POST /api/recommendations/search` | `{ "conditions": { "maxPrice": 5000, "purpose": null, "tastes": ["DECAF"], "lat": 37.62, "lng": 126.83 } }` | Gemini 조건 추출 없이 DB 검색. 위치는 선택 사항 |
| `POST /api/recommendations/chat/prepare` | `{ "message": "...", "selectedConditions": { "maxPrice": 3000, "purpose": null, "tastes": ["MILK"] }, "location": { "lat": 37.62, "lng": 126.83 } }` | mock 또는 Gemini로 조건 추출 후 선택한 칩과 병합; 최종 조건·자연어 근거·미해결 항목·서명된 `proposalId` 반환 |
| `POST /api/recommendations/chat/confirm` | `{ "proposalId": "...", "confirmed": true }` | 서명·만료·미해결 여부 확인 후 같은 DB 검색 |

`selectedConditions`는 선택 사항이다. 자연어에서 언급하지 않은 예산·목적은 선택한 칩을 유지하며, 명시한 값은 자연어를 우선한다. 취향은 중복 없이 합친다. 위치는 `location`에서만 반영한다. 자연어 원문 근거는 추출된 조건에 대한 것이며, 병합된 최종 조건 전체를 사용자가 확인한 뒤 검색한다. 조건 해제·제외 요청은 미지원으로 남기며 칩에서 변경한다.

Gemini 호출은 응답 본문 수신을 포함해 10초로 제한한다. 추천 이유 호출이 시간 초과되면 DB 검색 결과와 기본 문구를 그대로 반환한다. 자연어 추출이 시간 초과되면 504와 재시도·칩 검색 안내를 반환한다. 앱 요청 제한은 20초다.

지원 조건은 0 이상 정수 예산, `DRIVE_THRU`, `DECAF`, `MILK`다. 조용함·콘센트·산미·고소함·단맛, 공부·대화, 실제 이동 시간은 아직 지원하지 않는다. 정상 빈 검색은 `items: []`; DB 오류는 503이다. 응답의 `matchedMenu`는 일치한 가격 옵션이고 `isDemo: true`, `checkedAt: null`이다. 가격순 상위 매장 3곳을 반환한다. Gemini 이유 선택은 설정이 `gemini`일 때만 시도하며, 검증 실패 시 DB 근거 문구로 돌아간다. 실제 MySQL·Gemini·기기 연결 성공 여부는 이 명세만으로 주장하지 않는다.
