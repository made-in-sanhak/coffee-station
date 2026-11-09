# AI API 계약 초안 — Express 실시간 처리 / Python 리뷰 분석

기준일: 2026-11-09. 작업지침서 1단계 산출물.
6단계 변경: [위치 계약](AI_LOCATION_FLOW.md)에 따라 모의 경로는 prepare.location 및 constraints.location/radius_m/sort_by=distance를 지원한다. 아래 가격순 전용 설명은 초기 계약이며 해당 항목은 위치 계약을 우선한다. SQL 위치 조회와 프런트 거리 입력은 아직 미지원이다.
상태: **현재 코드 대조 완료, 팀 계약 합의 전**. 아래의 목표 계약은 아직 구현된 기능이 아니다.
2단계 반영: 서비스 내부는 `backend/src/recommendations/`로 분리되었다. 요청·응답 및 토큰 형식은 유지한다. Gemini 설정/모드 오류는 시작 시 검증하며, 모의 리뷰 API도 production에서 503이다. 아래 최초 대조 내용 중 해당 두 항목은 이 변경 기록을 우선한다.
사용자가 선택한 개발 방향과 현재 체크아웃을 기준으로 작성했다. 원격 PR #9의 최신 코드·리뷰나 팀 승인 여부는 이번에 조회하지 않았다.

## 1. 책임과 현재 확인 범위

- Express: 자연어 추출 요청, 입력/출력 검증, 사용자 확인, 검색·추천 계산, 결과 조회 API.
- Gemini: 자연어 조건 제안. 가격·판매 여부·매장 사실을 생성하지 않는다.
- Python: 리뷰 조회→분석→근거 검증→저장 작업. 현재는 모의 분석 JSON 내보내기만 구현되어 있다.
- 앱: 원문 입력, 제안 표시·수정·명시적 확인, 결과 표시. Python HTTP 서버를 직접 호출하지 않는다.
- 운영 DB: 후보·가격·분석 결과의 기준 저장소가 될 예정이며 새 Express 추천에는 아직 연결되지 않았다.

대조한 코드:

- [서버 서비스](../backend/src/services/recommendations.ts), [추천 라우터](../backend/src/routes/recommendations.ts), [리뷰 라우터](../backend/src/routes/reviewSummaries.ts)
- [공통 응답](../backend/src/common/response.ts), [오류 처리](../backend/src/middlewares/errorHandler.ts)
- [프런트 추천 호출](../frontend/src/api/recommendations.ts), [리뷰 호출](../frontend/src/api/reviewSummary.ts), [공통 클라이언트](../frontend/src/api/client.ts)
- [RootNavigator](../frontend/src/navigation/RootNavigator.tsx), [추천 화면](../frontend/src/RecommendationScreen.tsx), [authStore](../frontend/src/store/authStore.ts)

## 2. 현재 구현 계약

### 공통 응답

성공 HTTP 200: `{"success":true,"data":{},"message":null}`.
오류: `{"success":false,"data":null,"message":"안내 문구"}`와 해당 HTTP 상태.
현재 기계 판독용 `error.code`, 요청 ID, API 버전 필드는 없다. 프런트 `apiFetch`는 `data`만 반환하고 오류는 문구만 가진 Error로 바꾼다.

### POST /api/recommendations/prepare

```json
{"message":"4천 원 이하 커피를 저렴한 순으로 추천해줘."}
```

- message: 비어 있지 않은 문자열, 최대 4,000 JavaScript 문자열 길이(UTF-16 코드 단위).
- 위치·반경 입력은 현재 처리하지 않는다. 별도 필드를 넣어도 위치 조건이 해결되지 않는다.
- mock 모드는 위 예시 문장만 지원한다(앞뒤 공백 제거 후 비교).
- 다른 모의 문장은 추출값 null, 근거 {}, unresolved 안내를 반환한다.
- Gemini 경로는 REST 호출 코드만 있고 이번 이전 작업에서 실제 호출 검증 전이다.

위 예시의 `data` 형태(토큰/문구는 설명용):

```json
{
  "status":"AWAITING_CONFIRMATION",
  "proposal_id":"<opaque-signed-token>",
  "proposal":{
    "max_price_krw":4000,
    "category":"COFFEE",
    "sort_by":"price",
    "evidence":{"max_price_krw":"4천 원 이하","category":"커피","sort_by":"저렴한 순"},
    "unresolved":[]
  },
  "suggested_constraints":{"max_price_krw":4000,"category":"COFFEE","sort_by":"price","limit":20},
  "extraction_mode":"mock",
  "llm_calls":0,
  "expires_in_seconds":600,
  "notice":"조건을 확인하세요. 기본 정렬은 가격순입니다. 미해결 조건은 문장을 수정하여 다시 준비하세요."
}
```

unresolved가 있으면 status는 `NEEDS_CLARIFICATION`이다. 현재 미해결 제안은 confirm 불가이며 문장을 바꿔 prepare를 다시 해야 한다.
추출 sort_by는 null/price/distance이지만, suggested_constraints.sort_by는 항상 price다. distance 요청은 unresolved로 차단한다. 이 기본값을 거리 조건 해결로 표시하면 안 된다.

### POST /api/recommendations/confirm

```json
{
  "proposal_id":"<prepare에서 받은 토큰>",
  "confirmed":true,
  "constraints":{"max_price_krw":4000,"category":"COFFEE","sort_by":"price","limit":20}
}
```

| 필드 | 현재 허용값/처리 |
|---|---|
| confirmed | 반드시 boolean true |
| proposal_id | 서명·10분 만료·미해결 여부 검증. 프런트에서는 해석하지 않고 전달 |
| constraints | 객체 필수. 아래 4개 외 필드는 422 |
| max_price_krw | null 또는 0 이상 안전한 정수, 누락 시 null. 상한 포함 |
| category | null 또는 COFFEE/LATTE/TEA/ETC, 누락 시 null |
| sort_by | price 또는 누락(기본 price). null/distance 거절 |
| limit | 정수 1~100, 누락 시 20 |

현재 토큰은 사용자 소유권·1회 사용을 보장하지 않는다. 동일 토큰으로 다른 확정 조건을 재전송할 수 있다.
서명은 원래 추출 제안을 보호하지만 수정 constraints와 비교하지 않는다. 누락 필드의 기본값으로 예산/종류가 사라질 수도 있으므로 운영용 수정 정책이 필요하다.
COFFEE는 커피 분류이며 특정 메뉴(아메리카노)와 동의어가 아니다.

위 조건의 `data` 형태:

```json
{
  "status":"RESULT",
  "message":"임시 데이터 기반 추천입니다.",
  "recommendations":[
    {
      "cafe":{"id":"test-cafe","name":"가상 카페"},
      "offer":{"id":"m4","name":"에스프레소","category":"COFFEE","price_krw":3000,"evidence":{"is_mock":true}},
      "distance_m":null
    },
    {
      "cafe":{"id":"test-cafe","name":"가상 카페"},
      "offer":{"id":"m1","name":"아메리카노","category":"COFFEE","price_krw":3500,"evidence":{"is_mock":true}},
      "distance_m":null
    },
    {
      "cafe":{"id":"test-cafe","name":"가상 카페"},
      "offer":{"id":"m5","name":"디카페인 커피","category":"COFFEE","price_krw":4000,"evidence":{"is_mock":true}},
      "distance_m":null
    }
  ],
  "llm_calls":0,
  "trace":[{"event":"search","mode":"express-direct","result_count":3}]
}
```

예시 결과는 m4(3,000원), m1(3,500원), m5(4,000원) 3개다.
검색 결과가 없으면 HTTP 200, status QUESTION, recommendations [], 자동 조건 완화 없이 질문 문구를 반환한다.
추천은 고정 모의 메뉴 6개를 가격순으로 검색한다. 리뷰 점수·거리·개인화는 아직 없다.

### POST /api/recommendations/

`{"constraints":{...}}`로 토큰·confirmed 없이 직접 검색한다. 현재 로컬 개발 경로이며 공개 범위를 합의해야 한다.
운영 공개 여부와 무관하게 인증·호출 제한을 우회하는 예외 경로로 남겨서는 안 된다.

### GET /api/cafes/:cafeId/review-summary

- 현재 cafeId `990001`만 지원하며 Python이 내보낸 mock JSON 파일을 읽는다.
- 응답에는 data_mode mock, status, cache_hit, llm_calls, summary.review_count/generated_at/opinions 등이 있다.
- cache_hit/llm_calls는 저장된 분석 산출물의 값이다. GET 요청에서 모델을 호출하거나 분석 캐시를 갱신했다는 의미가 아니다.
- 다른 매장 404, 파일 없음/읽기·파싱 실패/일부 검증 실패 503.
- 2단계에서 production 503 차단을 추가했다. 모의 파일 조회가 운영에 노출되지 않는다.

### 오류 및 제한

| HTTP | 현재 사례 |
|---|---|
| 400 | JSON 본문 파싱 실패 |
| 404 | 등록되지 않은 경로, 모의 리뷰 대상 외 매장 |
| 409 | 명시적 확인 없음, 토큰 변조/만료/미해결 |
| 422 | 문장·확정 조건 검증 실패 |
| 429 | 로컬 IP별 분당 10회 제한 또는 Gemini 429 |
| 502 | Gemini 호출/응답 처리 실패 |
| 503 | production 추천 차단, 모델 설정 누락, 모의 리뷰 파일 문제 |
| 500 | 처리되지 않은 서버 오류 |

보완 A 이후 모델 제안의 가격/분류 검증 실패는 502로 반환한다. 사용자 확정 조건 오류는 422다. Gemini 키/모델 누락 및 잘못된 모드는 서버 시작 오류이며 HTTP 응답을 기다려 확인하는 항목이 아니다.
보완 C 이후 TTL·시간 제한·로컬 호출 제한은 `backend/src/config/aiPolicy.ts`에서 정의한다. 기본값은 기존과 같다. 운영 차단은 NODE_ENV=production에 의존하며 누락 시 development이므로 배포 설정 검증이 필요하다.
로컬 IP 제한은 prepare/confirm/직접 검색 합산이며 프로세스별이다. Retry-After는 아직 제공하지 않는다.
서버의 인증 미들웨어는 현재 체크아웃에서 확인되지 않았다. 프런트 authStore가 토큰 getter를 연결하는 것만으로 서버 인증 완료가 되지는 않는다.

## 3. 프런트 호환성 및 차이

| 항목 | 확인 결과 / 영향 |
|---|---|
| 서버 모드 요청 | 기존 추천 화면의 prepare/confirm 경로·필드와 일치 |
| 모의 제한 | 프런트는 extraction_mode가 mock이 아니거나 offer.evidence.is_mock이 false이면 거절. 실제 경로 지원은 후속 변경 |
| 로컬 limit | 로컬 confirm은 limit를 적용하지 않음. 서버와 결과 수가 다를 수 있음 |
| 미지원 로컬 문장 | 로컬은 미해결 상태에서도 예시 조건을 반환, 서버는 null 조건. 사용 가능 제안으로 표시 금지 |
| ID | 현재 프런트 Result 타입에는 cafe.id/menu_id가 없고 offer.id만 있음. 지도 연결 계약 부족 |
| 화면 진입 | RootNavigator는 로그인/지도 화면. 별도 추천 화면은 이 네비게이션에 등록되지 않음 |
| 폴더 | 기존 독립 추천/리뷰 파일은 screens/recommend/, api/endpoints/ 규칙과 정리 필요 |
| 오류 UX | apiFetch가 HTTP 상태를 버리므로 429/만료 등 상태별 대응에 후속 변경 필요 |

## 4. 목표 계약 권장안 — 미구현·합의 대기

기존 경로와 공통 success/data/message를 유지하는 쪽을 우선 검토한다. 변경 시 API 버전/호환 기간을 명시한다.

| 결정 항목 | 권장안 | 확인 주체/후속 단계 |
|---|---|---|
| 아키텍처 | 실시간 Express, 비동기 Python 분석. 제안서에도 작업 실행 경로 명시 | 백엔드·AI·배포 담당 / 팀 확인 |
| 화면 통합 | #9와 하나의 화면·타입으로 통합, 기존 로그인/지도/탭바 보존 | 프런트 담당 / 10단계 |
| ID | cafe.id/menu_id/offer.id는 문자열. offer는 매장별 판매 옵션 ID. staging 코드·Kakao 장소 ID와 구분 | DB·지도 담당 / 5~6단계 |
| 위치 | prepare에 명시적 location(latitude, longitude)·radius_m 입력 계약 추가. 없으면 위치 질문, 제공 후 재준비 | 프런트·지도·백엔드 / 6단계 |
| 수정 조건 | 화면에서 최종 조건 전체를 표시하고 확인. 지원 필드만 수정 허용, 삭제/완화도 명시적 확인. unresolved는 우회 불가 | 프런트·AI / 3단계 |
| 토큰 | 10분 유지안, 검증된 사용자·스키마 버전·독립 서명 키에 바인딩. 앱 저장/로그에 장기 보관 금지 | 인증 담당 / 3단계 |
| 재확인 | 읽기 전용 재검색 허용 여부를 먼저 결정. 멱등 키 채택 시 사용자+조건 해시 바인딩, 가격 갱신 의미 명시 | 백엔드 / 3단계 |
| 직접 추천 | 개발 전용을 우선 유지. 구조화 필터 UI에 필요하면 별도 정식 계약 및 같은 인증·제한 적용 | 프런트·백엔드 / 3~4단계 |
| 오류 | 기존 envelope를 유지하며 안정적 오류 코드·request_id 추가 검토. 프런트에 상태 보존, 429 Retry-After | 백엔드·프런트 / 2~4단계 |
| 리뷰 조회 | 저장 결과만 조회, 입력 버전·유효성 확인. mock 파일은 운영 제외 | AI·DB 담당 / 7단계 |
| 추천 순위 | 필수 필터 우선. 리뷰 특징·가중치는 실험값, 명시적 가격순/거리순 요청을 임의 점수로 대체 금지 | AI·기획 / 9단계 |

위 표는 팀에 메시지를 보냈거나 합의를 받은 기록이 아니다. 공유 상태 저장소·인증 사용자 ID의 출처·#9 최종 응답 타입은 아직 미확정이다.

## 5. 1단계 결과와 다음 진입 조건

- 완료: 현재/목표 계약 분리, 요청·응답 예시, UI 차이, 운영 결함, 담당자 확인 목록 작성.
- 검증: 실제 소스의 경로·필드·상태 분기와 문서 대조. 이번 단계는 문서 작업이며 API/DB/Gemini 실행 검증은 하지 않았다.
- 미완료: 팀 승인과 외부 PR 대조. 1단계 전체를 합의 완료로 표시하지 않는다.
- 다음: 2단계는 현재 호환 계약을 유지하며 모듈/설정 분리·독립 모의 테스트·모의 리뷰 운영 제한을 진행 가능하다. 인증/공유 저장소나 프런트 변경은 해당 계약 확정 후 진행한다.
