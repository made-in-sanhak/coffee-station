# 카카오 로그인·커뮤니티 인증 통합

2026-11-25 PR #39의 팀 구현과 로컬 구현을 비교해 하나의 회원·토큰·인증 경로로 통합했다.
팀의 users/refresh_tokens·권한·내 정보 조회와 로컬의 일회용 로그인 검증·세션 폐기·커뮤니티 기능을 함께 사용한다.

## 실행 계약

- POST /auth/kakao/start: 5분 일회용 authorizeUrl/state/flowToken/redirectUri 반환.
- POST /auth/kakao: {code,redirectUri,state,flowToken}. 정확한 redirect와 일회용 흐름을 검증한 뒤 카카오 토큰/프로필 조회, 회원 저장, 서비스 토큰 발급.
- GET /api/users/me: 같은 회원·세션 검증을 통과한 내 정보(id,nickname,profileImageUrl,role).
- POST /api/auth/refresh: {refreshToken}. 행 잠금으로 한 번만 교체하고, 새 access 서명에 성공한 뒤 이전 refresh를 폐기한다.
- POST /api/auth/logout: {refreshToken}. 해당 세션을 폐기하며 기존 access로 내 정보·리뷰 쓰기도 즉시 거부한다. 반복 로그아웃은 성공한다.

JWT는 용도별로 분리한 키의 HS256이며 sub/role/sid/issuer/audience/용도/시간을 검증한다.
access는 1시간, refresh 세션은 로그인부터 최대 14일이다. 갱신해도 전체 세션 수명을 연장하지 않는다.
refresh 원문은 저장하지 않고 SHA-256 해시를 보관한다. 인증이 필요한 모든 API는 같은 active 회원 및 유효 세션을 검사한다.
세션 시간 비교에는 저장할 때와 동일한 날짜 변환을 적용한다.
롤백 실패 연결은 폐기하며 DB 상세 오류와 카카오 secret/code/token을 응답이나 로그에 노출하지 않는다.
카카오 토큰·프로필 호출은 응답 본문을 포함해 각 5초 제한, 401/502/504를 구분한다.
로그인·세션 API의 IP 제한은 인스턴스별 개발 보호이며 운영의 공유 제한을 대체하지 않는다.

## 설정

실제 .env는 Git에서 제외한다. JWT_SECRET은 32자 이상의 충분히 무작위인 값이어야 한다.
KAKAO_REST_API_KEY/KAKAO_REDIRECT_URI를 설정한다. 콘솔에서 시크릿을 사용하는 앱은 KAKAO_CLIENT_SECRET도 필요하다.
시크릿을 사용하지 않는 앱은 비워둘 수 있다. 프론트는 서버가 발급한 로그인 URL을 사용한다.
프론트에는 Babel allowlist의 공개 설정만 포함하며 JWT/client secret은 앱 번들에 넣지 않는다.

## DB 적용과 기존 데이터 이전

일반 개발 실행은 루트 또는 backend에서 `npm run dev`를 사용한다. DB 적용·초기 데이터·기존 DB 백업은 자동 처리한다.
자세한 준비 단계는 development-startup.md를 참고한다. 수동 DB 준비만 필요하면 backend에서 아래 명령을 사용한다.

```powershell
npm.cmd run db:community
```

- schema.sql: 신규 기본 테이블 및 팀 회원·refresh 테이블.
- 006_community_schema.sql: users 기준 리뷰·사진·좋아요·댓글·제보·이용 기록 테이블.
- 기존 community_accounts가 있는 DB는 002 기존 관계를 보완한 후 005로 이전한다.
- 005_unified_auth.sql + scripts/migrate-auth.cjs: active/session 열, 일회용 흐름, 작성자 매핑과 외래 키 통합.
- 003_import_generated_reviews.sql: 이전 생성 리뷰가 있으면 ID·출처를 유지하여 가져오기.
- 004_service_auth.sql은 이전 로컬 구조 기록이다. 새 설치에는 적용하지 않는다.

005는 단독 SQL 실행으로 끝나는 작업이 아니다. 위 스크립트를 통해 SQL과 회원 매핑을 함께 적용한다.
새 런타임의 회원은 users 하나이며 리뷰 작성자/댓글/좋아요/제보의 FK도 users를 가리킨다.
기존 로컬 회원은 숫자 ID가 아니라 카카오 회원번호로 팀 회원과 매칭한다.
매핑표 legacy_community_user_map을 남기고 기존 테이블은 legacy_auth_users/legacy_auth_sessions/legacy_community_accounts로 보관한다.
카카오 신원이 없던 수동 계정은 비활성 보존 계정으로 이전하여 다른 사람에게 잘못 연결하지 않는다.
이전 토큰 형식은 폐기되므로 앱 업데이트 후 다시 로그인해야 한다. 프론트·백엔드를 함께 배포한다.
새 로그인 요청에는 state/flowToken이 필수다. 이전 code/redirectUri만 보내는 클라이언트는 업데이트해야 한다.

DDL은 전체 트랜잭션으로 되돌릴 수 없으므로 백업이 필요하다. 작성자 관계 변경과 완료 표식은 하나의 트랜잭션으로 처리하고,
재실행 시 FK 추가·보관 작업을 마무리한다. 이력 SQL의 001/002 번호만 보고 일괄 실행하지 않는다.

## 확인 결과

- 통합 당시 프론트 전체 47개 테스트 파일, 249개 테스트 및 TypeScript 검사 통과.
- 리뷰 반영 후 프론트 TypeScript 검사 및 관련 4개 파일/18개 회귀 테스트 통과.
- 백엔드 전체 기본 검사 81개 통과(별도 DB opt-in 4개 생략), 실제 MySQL/HTTP 21개 및 회원 이전 검사 1개 통과.
- 통합 후 실제 앱 DB를 대상으로 한 직접 HTTP 검사 23개 통과.
- MySQL 검증: ID 충돌 계정 매핑·리뷰/댓글/좋아요/제보 보존·마이그레이션 재실행.
- HTTP/MySQL 검증: 로그인→내 정보→리뷰/사진/댓글/좋아요/제보→갱신→로그아웃,
  동시 갱신 단일 성공·서명 실패 시 이전 토큰 보존·DB 세션 만료·비활성 회원 차단.
- 실제 앱 DB에서 매장 21곳, 메뉴 594개, 가격 옵션 2740개, 리뷰 106개, 댓글 1개의 내용 보존을 해시로 확인했다.
- 적용 전 백업은 로컬 임시 폴더의 coffee-station-before-auth-unify-20261125-022808.sql이다. Git에 포함하지 않는다.
- 카카오 응답은 테스트 대역을 사용했다. 실제 계정 로그인·동의, 에뮬레이터 및 운영 배포는 이번 검증에 포함하지 않았다.
- 점주·OCR·쿠폰·구매·모임 API 구현은 이 PR 범위가 아니다.

실행 원본은 coffee-station-haengsin/backend이며 한글 경로 회피용 프론트 복사본은 C:/dev/coffee-station-reviews/frontend다.
이번 인증 통합에서 프론트 호출 계약은 앞서 동기화한 state/flowToken 방식을 그대로 사용한다.
현재 프론트 세션은 메모리 보관이며 앱 종료/만료 시 다시 로그인한다. 자동 refresh 재시도는 별도 과제다.

## PR 리뷰 반영

- 별도 backendUrl을 저장하지 않아도 서비스 refresh 토큰이 있으면 apiFetch의 유효 서버 주소로 로그아웃 폐기를 보낸다.
  기본/사용자 서버 주소, 만료 access 미전송, 미리보기 종료 시 서비스 요청 생략을 검증했다.
- 명시적인 아이스 메뉴를 비교하면 선호 온도가 HOT이어도 요청과 캐시 비교에 ICE를 사용한다.
  메뉴를 바꿀 때 온도를 다시 계산하며 저장된 사용자 선호는 유지한다.
- 리뷰 등록·좋아요 처리에 공통 transaction helper를 적용했다.
  쓰기 실패 후 정상 롤백은 release, 롤백 실패는 destroy하며 원래 오류를 유지한다.
  두 경로의 롤백 성공/실패 4가지 HTTP 오류 주입 테스트와 실제 MySQL 기능 검증을 통과했다.
