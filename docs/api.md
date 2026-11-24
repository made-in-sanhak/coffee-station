# 앱 ↔ Express API 안내

> 현재 구현 안내. 제품 목표 API 초안은 `산학프로젝트/최신 문서/커피 주유소 · API 명세서`에 있다. 추천 탭 구현과 검증 범위는 [추천 MVP 구현 기준](recommendation-mvp-implementation.md) 참조.

현재 구현된 AI 경로와 요청·응답은 [실시간 추천](ai-recommendation.md)을 따른다. 공통 성공 응답은 `{"success":true,"data":{},"message":null}`이다. `/health`는 서버·DB 상태를 보고한다.

인증, 카페·메뉴, 구매, OCR 등 전체 제품 API 명세는 팀 계약 확정 후 추가한다. 구현되지 않은 경로를 현재 API로 표시하지 않는다.

## 매장 (`/api/cafes`)

매장 API는 `backend/src/modules/cafes/router.ts` 한 곳에서만 정의한다. 리뷰 요약(`/:cafeId/review-summary`)만 `modules/reviewSummaries/router.ts`에 있다. 같은 접두사에 라우터를 새로 붙이지 않는다.

| 경로 | 요청 | 처리 |
| --- | --- | --- |
| `GET /api/cafes` (`menu` 있음) | `latitude`, `longitude`, `radius`, `menu`, `temperature`, 선택 `size`·`sort` | 지도 가격 조회. 개발용 DB 시드 모드(`MVP_CATALOG_MODE=mysql-seed`)에서만 동작하고, 그 외·운영에서는 503 |
| `GET /api/cafes` (`menu` 없음) | 선택 `query`(이름·주소 검색), 선택 `latitude`·`longitude`·`radius` | 매장 목록·검색. 위치가 있으면 반경(기본 1000m) 안을 가까운 순으로 반환 |
| `GET /api/cafes/options` | 없음 | 지도에서 고를 수 있는 사이즈 목록 (DB 시드 모드에서만) |
| `GET /api/cafes/:id` | 숫자 매장 ID | 매장 상세. 없는 ID는 404 |
| `GET /api/cafes/:id/menus` | 숫자 매장 ID | 매장 메뉴·가격 목록. 없는 ID는 404 |

## 개발용 추천 탭 경로 (2026-11-11)

현재 Express 접두사는 `/api/recommendations`이며 `/api/v1` 제품 명세와 다르다. `NODE_ENV=production`에서는 모든 추천 경로가 503으로 차단된다. `MVP_CATALOG_MODE=mysql-seed`에서 행신 DEMO 가격만 조회한다.

| 경로 | 요청 | 처리 |
| --- | --- | --- |
| `POST /api/recommendations/search` | `{ "conditions": { "maxPrice": 5000, "purpose": null, "tastes": ["DECAF"], "lat": 37.62, "lng": 126.83 } }` | Gemini 조건 추출 없이 DB 검색. 위치는 선택 사항 |
| `POST /api/recommendations/chat/prepare` | `{ "message": "...", "selectedConditions": { "maxPrice": 3000, "purpose": null, "tastes": ["MILK"] }, "location": { "lat": 37.62, "lng": 126.83 } }` | mock 또는 Gemini로 조건 추출 후 선택한 칩과 병합; 최종 조건·자연어 근거·미해결 항목·서명된 `proposalId` 반환 |
| `POST /api/recommendations/chat/confirm` | `{ "proposalId": "...", "confirmed": true }` | 서명·만료·미해결 여부 확인 후 토큰에 담긴 조건으로 DB 검색. 본문에 조건을 추가해도 적용되지 않음 |

`/search`와 `/chat/confirm`은 공통 성공 응답의 `data`에 `items`를 반환한다. 예를 들어 일치하는 메뉴가 없으면 `{"success":true,"data":{"items":[]},"message":null}`이다. `/chat/prepare`의 `data.status`는 조건을 확인할 수 있을 때 `AWAITING_CONFIRMATION`, 미해결 조건이 있을 때 `NEEDS_CLARIFICATION`이다. 명시적 확인이 없거나 제안이 유효하지 않으면 `/chat/confirm`은 409를 반환한다.

기존 모의 경로인 `POST /`, `/prepare`, `/confirm`은 [실시간 추천](ai-recommendation.md)에 별도로 정리했다. 기존 프런트의 `RecommendationScreen`은 `api/recommendations.ts`를 통해 모의 `/prepare`와 `/confirm`을 호출하며, 기존 루트 경로는 백엔드 테스트에서 사용한다.

`selectedConditions`는 선택 사항이다. 자연어에서 언급하지 않은 예산·목적은 선택한 칩을 유지하며, 명시한 값은 자연어를 우선한다. 취향은 중복 없이 합친다. 위치는 `location`에서만 반영한다. 자연어 원문 근거는 추출된 조건에 대한 것이며, 병합된 최종 조건 전체를 사용자가 확인한 뒤 검색한다. 조건 해제·제외 요청은 미지원으로 남기며 칩에서 변경한다.

Gemini 호출은 응답 본문 수신을 포함해 10초로 제한한다. 추천 이유 호출이 시간 초과되면 DB 검색 결과와 기본 문구를 그대로 반환한다. 자연어 추출이 시간 초과되면 504와 재시도·칩 검색 안내를 반환한다. 앱 요청 제한은 20초다.

지원 조건은 0 이상 정수 예산, `DRIVE_THRU`, `DECAF`, `MILK`다. 조용함·콘센트·산미·고소함·단맛, 공부·대화, 실제 이동 시간은 아직 지원하지 않는다. 정상 빈 검색은 `items: []`; DB 오류는 503이다. 응답의 `matchedMenu`는 일치한 가격 옵션이고 `isDemo: true`, `checkedAt: null`이다. 가격순 상위 매장 3곳을 반환한다. Gemini 이유 선택은 설정이 `gemini`일 때만 시도하며, 검증 실패 시 DB 근거 문구로 돌아간다. 실제 MySQL·Gemini·기기 연결 성공 여부는 이 명세만으로 주장하지 않는다.
