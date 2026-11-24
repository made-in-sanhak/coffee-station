# 가격 비교·매장 제보·리뷰 API (로컬 작업)

프론트 변경, git commit/push 없음. 이벤트·할인·점주 승인·로그인 발급 API는 제외.

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

## 실제 로그인 연결 (쓰기 기능 전 필수)

현재 카카오 로그인은 미완성이다. 조회는 비로그인 가능하지만 리뷰 작성·좋아요·댓글·가격 제보는
정상 서비스 액세스 토큰이 필요하다. mock/Kakao 토큰이나 요청의 authorId를 신원으로 쓰지 않는다.
로그인 담당자는 회원 조회/생성 후 동일 서비스 ID/닉네임을 community_accounts(user_id,nickname)에
upsert하고 아래 토큰을 발급한다. 정지/탈퇴 시 active=0으로 동기화한다.

- JWT_SECRET: 서버 공통 무작위 32자 이상. change-me 기본값 금지. git에 저장하지 않는다.
- header: alg=HS256, typ=JWT, crit 미지원.
- claims: sub=양의 안전한 정수 회원 ID 문자열, iss=coffee-station, aud=coffee-station-app,
  token_use=access, iat=발급 Unix 초, exp=만료 Unix 초. nbf가 있으면 검증한다.
- 기존 프론트 응답 {accessToken,refreshToken,user:{id:number,nickname,profileImageUrl}} 유지.
- 최종 팀 JWT 규격이 다르면 modules/community/auth.ts 어댑터를 변경한다. 프론트 수정은 불필요하다.
- 이 작업은 회원 로그인·리프레시 발급/폐기를 대체하지 않는다. 매 요청 활성 계정을 검증한다.

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
별도 DB에 schema.sql, 002, tests/fixtures/community.sql을 순서대로 적용한다.
통합 테스트는 명시적으로 선택한 테스트 DB의 기능 데이터를 초기화한다. 운영/앱 DB에는 실행하지 않는다.
에뮬레이터 UI는 정상 로그인 연결 후 비교·가격 제보·휴게소 리뷰/댓글/좋아요로 별도 검증한다.
