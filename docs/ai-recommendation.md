# 실시간 추천 — Express

발표용 정확한 메뉴/온도/사이즈 조건은 별도 `/api/recommendations/mvp/search·prepare·confirm` 경로를 사용한다. [MVP 계약](midterm-recommendation-contract.md)을 따른다. 기존 category 기반 API와 DTO가 다르며 프런트 통합 전이다. MVP prepare도 EXTRACTION_MODE에 따라 mock/Gemini를 선택하고 나머지 검색은 현재 모의 데이터다. 실제 API 추가 호출은 사용자 확인 후 진행한다.

기준: 2026-11-10 현재 코드. 팀 화면·인증 계약은 아직 합의 전이다. 앱의 실시간 요청은 [Express 라우터](../backend/src/modules/recommendations/router.ts)가 처리한다. Python HTTP 서버는 없다.

## 현재 요청과 응답

공통 응답은 성공 시 `{"success":true,"data":{...},"message":null}`, 오류 시 `{"success":false,"data":null,"message":"..."}`다. 기계 판독용 오류 코드와 요청 ID는 없다.

| 경로 | 입력 | 현재 처리 |
|---|---|---|
| `POST /api/recommendations/prepare` | `message`(1~4000 UTF-16 코드 단위), 선택적 `location:{latitude,longitude}` | 모의 또는 Gemini 추출 결과를 근거·미해결 조건과 함께 제안. `proposal_id`, `suggested_constraints`, 600초 만료 반환 |
| `POST /api/recommendations/confirm` | `proposal_id`, `confirmed:true`, `constraints` | 제안 서명·만료·미해결 여부를 검사하고 확정 조건 검색. 수정 조건 자체는 원 제안과 비교되지 않음 |
| `POST /api/recommendations/` | `constraints` | 구조화 조건 직접 검색. 현재 개발 경로이며 인증 정책 확정 전 |
| `GET /api/cafes/:cafeId/review-summary` | 모의 매장 `990001` | [Python 모의 파일](ai-review-analysis.md)을 읽어 검증 후 반환. 운영에서는 503 |

`constraints`는 `max_price_krw`(0 이상 안전한 정수 또는 null), `category`(COFFEE/LATTE/TEA/ETC 또는 null), `sort_by`(price/distance), `limit`(1~100), 선택적 `location`, 양수 `radius_m`만 받는다. 거리순·반경에는 위치가 필요하다. 지원하지 않는 조건을 조용히 버리거나 예산을 완화하지 않는다. 모의 위치·거리는 합성 좌표와 직선거리이며 실제 지도 결과가 아니다.

현재 기본 Repository는 모의 메뉴다. `MySQLMenuRepository`는 주입된 조회 함수를 이용한 격리 구현이며 HTTP 기본 경로에 연결되지 않았다. 판매 상태·출처·검증일을 검사하고, SQL 위치 검색은 명시적으로 거절한다. 가격·거리·근거 없는 추천은 하지 않는다. 리뷰 기반 점수 모듈도 별도 모의 실험이며 실시간 추천 순위에 연결되지 않았다.

확인 토큰은 HMAC 서명과 10분 만료를 사용한다. 무상태이므로 1회 사용·사용자 소유권을 보장하지 않는다. 인증 사용자용 `ownedProposals`와 사용자별 `quota`는 격리 모듈로 구현됐지만 HTTP 경로와 공유 저장소에는 연결되지 않았다. 현재 로컬 IP 제한은 프로세스별 분당 10회다. `NODE_ENV=production`이면 추천 전체와 모의 리뷰 조회가 503으로 차단된다. 이 차단은 운영 준비 완료를 뜻하지 않는다.

## 모의 검증

`backend` 디렉터리에서 `npm run build` 후 `node --test tests/recommendations.cjs`를 실행한다. 테스트가 임시 리뷰 파일을 만들고 정리하므로 Python 선행 작업은 필요 없다. 모의 추출은 등록된 예시 문장만 지원하며 실제 Gemini 품질 검증이 아니다. Gemini 모드에는 키와 모델 설정이 필요하지만 실제 API 평가는 별도 승인된 작업에서 수행한다.

프런트 요청·응답과 지도·탭 진입점은 담당자와 합의 전이다. 운영 활성화 전에는 인증, 사용자별 공유 제한, 제안 소유권·수정 규칙, 실제 가격·좌표 검색, 여러 서버 통합 검증이 필요하다.

## 모듈별 책임

기능 코드는 [modules/recommendations](../backend/src/modules/recommendations)에 모인다. router는 HTTP, service는 준비·추천 조합, contracts는 입력/모델 출력 검증, extraction은 모의/Gemini 호출, repository/mysqlRepository는 데이터 접근, proposals/ownedProposals는 제안 검증, quota는 할당량 계약, ranking은 오프라인 순위 실험이다. 리뷰 파일 조회와 검증은 [modules/reviewSummaries](../backend/src/modules/reviewSummaries)에 있다.

### 제안과 호출 제한

현재 HTTP의 proposals는 JWT_SECRET을 사용하고 임시 키는 자동 테스트에서만 허용한다. 일반 실행에서 키가 없으면 503으로 거절한다. 서버 간 같은 키가 필요하며 실제 다중 서버 검증은 아직 남아 있다. MVP 경로의 별도 개발 토큰은 여전히 프로세스 임시 키다. 별도 ownedProposals는 전용 32바이트 이상 키, 검증된 사용자 ID, 목적·버전·발행/만료를 검사한다. 서명은 암호화가 아니므로 원문이 포함된 토큰을 로그에 기록하지 않는다. 읽기 전용 재검색은 만료 전 반복 허용하는 정책 초안이며 동일 응답·1회 사용을 보장하지 않는다. 인증 연결·전용 키 주입/교체·수정/완화 명시 확인·기존 토큰 재준비 처리가 남아 있다.

QuotaStore는 제공자 시도 직전 원자적 예약 후 finally 해제하는 계약이다. 승인 예약은 성공/실패 모두 차감하고 재시도마다 새 예약, 거절은 미차감이다. 최근 60초/UTC 자정 일일 횟수/동시 lease를 다루며 MockQuotaStore는 테스트 전용이다. 실제 공유 저장소 시간·원자성, 저장소 장애 503, HTTP Retry-After, 취소/전체 기한·lease보다 짧은 실행 예산을 통합해야 한다. 직접 검색이나 모의 추출을 LLM 시도로 차감하지 않는다.

### SQL 데이터 계약

MySQLMenuRepository는 주입형 select(sql, parameters)를 사용한다. 매장 1~100개와 가격/분류/LIMIT을 바인딩하고 STORE/ON_SALE·비DEMO·검증일 존재·0 이상 가격을 조회한다. 가격/price_id 순으로 정렬하고 문자열 BIGINT ID, 메뉴 ID, 사이즈·옵션·출처·검증일을 보존한다. DB 오류/손상 행은 503, 정상 빈 결과는 QUESTION이다. 검증일 존재가 최신 가격 보장은 아니다. 실제 스키마 대조, 풀 execute 연결/종료·쿼리 제한, 읽기 전용 계정·TLS·검증일 신선도와 주변 매장 검색이 남아 있다. [행신 자료](../backend/sql/haengsin/README.md)는 staging 비교용으로 분리한다.

### 모의 거리 흐름

`가까운 커피 추천해줘.`를 위치 없이 prepare하면 NEEDS_CLARIFICATION이다. `location:{latitude:37,longitude:127}`과 함께 재준비하면 확인 가능하다. 서버가 추가한 위치 안내만 해소하며 다른 미해결 조건은 보존한다. 구조화 radius_m은 지원하지만 자연어 반경 추출은 아직 아니다. 합성 좌표의 Haversine 직선거리·반경 경계 포함을 사용하며 거리 동률은 가격/offer ID 순이다. 실제 GPS·Kakao·SQL 거리 연결은 미완료다. 미해결 사유의 구조화 코드 전환과 위치 보관 정책도 필요하다.

### 순위 실험

ranking은 HTTP에 미연결이다. 필수 필터 후 현재 revision과 일치하는 의견만 쓰고 reviewId별 중복 투표를 방지한다. 리뷰 신호는 (긍정-부정)/(긍정+부정+smoothing), 총점은 리뷰·분류 취향 신호의 설정 가중 합이다. 가중치는 운영 기본값이 아닌 실험값이다. 상반 의견/표본/특징 유무를 설명에 보존하고 가격순·거리순을 점수로 뒤집지 않는다. relevance는 오프라인 비교용이다. 검증된 분석 어댑터, 충분한 후보→점수→최종 limit, 신규/결측·매장 다양성·의미 품질 평가는 남아 있다.

## 전체 모의 테스트

backend에서 빌드 후 PowerShell로 실행한다. 테스트는 실제 DB/LLM을 호출하지 않는다.

```powershell
npm run build
$testFiles = @(Get-ChildItem -LiteralPath tests -Filter '*.cjs' | ForEach-Object { $_.FullName })
node --test @testFiles
```

현재 백엔드 20개 테스트가 있다. 사용자 입력 오류는 422, 모델 출력 검증 오류는 502다. 모델 모드/키·모델 누락 등 설정 오류는 시작 시 실패하며 test 모드에서는 개발 .env를 읽지 않는다. 정책의 TTL/요청 시간/로컬 제한은 config/aiPolicy.ts에서 관리한다. 실제 제공자 재시도·분산 인증/제한·오류 코드/요청 ID 통합은 미완료다.
