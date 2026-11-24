# 가격 비교·매장 제보·리뷰 API (로컬 작업)

develop `ab10386` 통합과 로컬 로그인 연결을 포함한 기능 작업이다.
PR 등록 시 확인한 develop `0bc2365`의 팀 로그인(#39)과 인증·회원 저장 구조를 통합해야 한다.
이벤트·할인·점주 승인 API는 제외하며 로그인 구현은 local-login-integration.md를 참조한다.

## DB 적용

기존 backend DB 환경변수를 사용한다. Docker의 coffee-mysql-haengsin을 먼저 켜고
backend 폴더 PowerShell에서 각 줄을 실행한다. DB_NAME 예: coffee_station_expanded.

```powershell
npm.cmd run db:community
npm.cmd run dev
```

002는 기능 테이블을 추가한다. 003은 generated_reviews가 있으면 기존 ID를 유지하여
community_reviews로 가져온다. 둘 다 재실행 가능하다. 001/기존 시드 파일은 보관한다.
기존 매장·메뉴 가격은 바꾸지 않으며 평점/리뷰 수는 리뷰 테이블 기준으로 갱신한다.
사진은 MySQL MEDIUMBLOB에 저장하여 서버 재시작 후 유지한다.

## 실제 로그인 연결

로컬 통합 브랜치에서 카카오 로그인 백엔드가 추가되었다. 자세한 실행/설정은
[로컬 로그인 통합](local-login-integration.md)을 따른다. 실제 회원 ID는 auth_users에서 발급하고
community_accounts에 연결한다. 인증 API가 서비스 JWT와 세션을 발급하므로 수동 계정 삽입은 필요 없다.
토큰 검증은 서명/만료/발급자/대상/세션/활성 회원을 확인한다. mock 토큰은 허용하지 않는다.
프론트 화면 구성은 유지하며 로그인 요청에 일회용 state/flowToken만 연결했다.

## 경로

| 메서드 | 경로 | 입력 |
|---|---|---|
| GET | /api/menus/compare | menu,size,temperature,latitude,longitude,radius,sort(price/distance/rating) |
| POST | /api/cafes/:id/price-requests | {menuId,reportedPrice,note} |
| POST | /api/cafes/:id/interactions | {type:DETAIL_VIEW 또는 DIRECTIONS,interactionKey:32~64자리 hex} |
| GET | /api/reviews | cafeId,category(리뷰/신메뉴/질문),authorId(본인만) |
| POST | /api/reviews | {cafeId,rating:1~5,text,category,images?:[{type,base64}]} |
| GET | /api/reviews/:id | 상세 |
| POST | /api/reviews/:id/like | 본인 좋아요 토글 |
| GET | /api/reviews/:id/comments | 댓글 목록 |
| POST | /api/reviews/:id/comments | {text} |
| GET | /api/review-images/:id | 이미지 바이너리 |

응답은 기존 {success,data,message}. 빈 비교 통계는 null. 가격 비교는 공백을 무시한 정확한 메뉴명,
디카페인 여부, 크기, HOT/ICE를 구분하고 기본=Regular로 처리한다. Tall/Large는 다른 크기다.
매장별 일치 옵션 최저가 한 개, 반경 1~5000m. 위치 없는 거리 정렬은 거부한다.
DEMO 출처는 보존하며 실제 가격 확인일처럼 반환하지 않는다.

화면 Menu.id는 menus.menu_id가 아니라 menu_prices.price_id이다. 제보는 해당 매장/옵션 조합을 검증하고
OPEN으로 저장한다. 제보만으로 판매가격을 변경하지 않는다. 점주 승인 기능은 별도 범위다.
통계는 동일 interactionKey 재전송을 한 번만 저장한다. 고유 방문자 수나 부정클릭 방지 시스템은 아니다.
사진은 최대 3장, 각 2MiB JPEG/PNG, JSON 최대 9MiB. 등록은 사진/리뷰/평점 갱신까지 트랜잭션이다.
좋아요는 사용자별 유일 키와 행 잠금으로 동시 토글을 처리한다. 댓글/리뷰 작성자 정보는 DB 계정을 쓴다.
영수증 인증 연동 전 verified=false. 이전 생성 리뷰는 source=GENERATED로 보존한다.

## 검증

backend에서 npm.cmd test. 기본 실행은 외부 DB 없이 수행한다.
communityHttp.cjs의 실제 HTTP/MySQL 검증은 COMMUNITY_TEST_DB=1 및
DB_NAME=coffee_features_test_숫자 때만 실행한다. 기존 앱 DB는 테스트 대상으로 거부한다.
이 브랜치의 별도 DB에 schema.sql, 002_community_features.sql,
tests/fixtures/community.sql, 004_service_auth.sql을 순서대로 적용한다.
팀 로그인의 002_auth_users.sql은 users/refresh_tokens를, 로컬 004_service_auth.sql은
auth_users/auth_sessions를 사용한다. 별도 회원 ID를 각각 발급하므로 테이블만 함께
적용해도 회원·세션이 자동 연결되지는 않는다. 통합 전 두 시스템을 혼용하지 않는다.
통합 테스트는 명시적으로 선택한 테스트 DB의 기능 데이터를 초기화한다. 운영/앱 DB에는 실행하지 않는다.
두 HTTP 테스트 파일은 같은 테스트 DB를 초기화하고 리뷰 수를 검증하므로 순차 실행한다.

```powershell
# 별도 테스트 DB 연결값과 COMMUNITY_TEST_DB=1을 설정한 backend 터미널에서 실행
node --test --test-concurrency=1 tests/communityHttp.cjs tests/serviceAuthHttp.cjs
```
에뮬레이터 UI는 정상 로그인 연결 후 비교·가격 제보·휴게소 리뷰/댓글/좋아요로 별도 검증한다.
