# 최신 develop + 로컬 로그인 통합

2026-11-25 원격 develop `ab10386b9be794802c402677e7b42d1e4ab6d983`을 로컬
`codex/local-login-integration`에 병합했다. 기존 기능 보존 커밋은 `bff5d0e`,
로그인 작업 보존 커밋은 `672dcb6`이다. 원격 push/PR/merge는 하지 않았다.

기존 메뉴 가격 시드, 리뷰·댓글·좋아요·가격 비교·가격 제보 API, 서비스 로그인 백엔드를 유지한다.
최신 develop의 메뉴 카테고리, 구매 캘린더, 점주 초대·메뉴판 화면, 추천 quota 변경을 반영했다.
팀에서 제거한 차고 화면·꾸미기 상태·카페인 기록 UI와 이전 로그인 후 이동 도우미는 되살리지 않는다.
로그인 보안 검증(state/일회용 flowToken)은 보존하면서 최신 sessionRevision/loginReturn 흐름으로
통합했다. 로그인 뒤 취향 설정 또는 지도, 요청한 리뷰 화면으로 이동하며 중복 콜백은 한 번만 처리한다.
점주·OCR·쿠폰 등 최신 프론트 화면의 존재가 해당 서버 API 구현 완료를 뜻하지는 않는다.

## 구현

- POST /auth/kakao/start: 5분 일회용 로그인 흐름, 카카오 authorize URL/state/flowToken 반환.
- POST /auth/kakao: {code,redirectUri,state,flowToken}; 인가 코드로 카카오 토큰 교환 후
  /v2/user/me 조회, 카카오 회원번호로 회원 생성/조회, 서비스 토큰+user 반환.
- POST /api/auth/refresh: {refreshToken}; 토큰을 회전하고 새 로그인 응답 반환.
- POST /api/auth/logout: {refreshToken}; 세션 폐기. 기존 accessToken도 기능 API에서 즉시 거부.
- JWT: HS256, issuer coffee-station, audience coffee-station-app, token_use access, sid.
  액세스 1시간, 세션/refresh 최대 30일. refresh 원문 대신 SHA-256 해시만 저장한다.
- 비활성 계정은 로그인/갱신/기능 쓰기 모두 차단. 카카오 secret/code/token을 로그에 남기지 않는다.
- 카카오 외부 HTTP는 요청/응답 본문 포함 8초 제한. 네트워크 502, 시간 초과 504.
- 프론트는 정확한 Redirect URI/state를 확인하고 profile-only/mock 응답을 정상 로그인으로 저장하지 않는다.
- 카카오 API만 테스트 대역으로 대체한 MySQL/HTTP 테스트로 로그인→리뷰/댓글/좋아요/제보→갱신→로그아웃을 검증했다.
  실제 카카오 계정의 동의/로그인과 실제 에뮬레이터 UI 검증은 별도다.

## 로컬 설정

루트 .env는 gitignore 대상이다. 로컬 JWT_SECRET을 생성하고 USE_MOCK_API=false로 변경했다.
기존 카카오 키/Redirect URI는 유지했다.
카카오 콘솔에서 클라이언트 시크릿을 사용하는 앱이면 서버 루트 .env에 추가해야 한다.
실제 secret은 채팅/코드/PR에 붙여넣지 말고 .env에서만 입력한다.
시크릿을 사용하지 않는 앱은 비워도 되며 서버는 설정된 경우에만 client_secret을 전송한다.
앱 빌드에는 Babel allowlist의 공개 키/Redirect URI/mock 설정만 들어가며 JWT_SECRET/client secret은 포함하지 않는다.
Redirect URI는 콘솔 등록값·프론트·백엔드가 일치해야 한다. 로그인 화면은 서버 URL을 사용한다.

공식 흐름 참고: https://developers.kakao.com/docs/ko/kakaologin/rest-api

## 실행

기존 백엔드/Metro는 Ctrl+C로 종료한 뒤 다시 실행한다. 기존 서버를 강제로 종료하지는 않았다.
Docker Desktop을 먼저 켠다. PowerShell에서 각 줄을 실행한다.

```powershell
docker start coffee-mysql-haengsin
cd "$env:USERPROFILE\OneDrive\바탕 화면\산학프로젝트\coffee-station-haengsin\backend"
$env:NODE_ENV='development'
$env:HOST='127.0.0.1'
$env:PORT='8080'
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='3307'
$env:DB_NAME='coffee_station_expanded'
$env:DB_USER='coffee'
$env:DB_PASSWORD='haengsin-local-demo'
npm.cmd run db:community
npm.cmd run dev
```

별도 터미널에서 Metro (로컬 실행 복사본, 한글 경로 회피):

```powershell
cd C:\dev\coffee-station-reviews\frontend
npm.cmd start -- --reset-cache
```

에뮬레이터를 켠 뒤 다른 터미널:

```powershell
cd C:\dev\coffee-station-reviews\frontend
npm.cmd run android -- --no-packager
```

코드 통합 후 원본과 C:/dev 복사본의 Git 관리 대상 frontend 파일 및 로컬 .env를 동기화했다.
최신 develop에서 삭제된 frontend 파일도 복사본에서 제거했다.
2026-11-25 이전 파일은 C:/dev/coffee-station-reviews/.develop-backup-날짜 폴더에 보관된다.
의존성 잠금 파일이 동일함을 확인했으며 node_modules와 로컬 Android 빌드 설정은 유지했다.
백엔드는 원본 폴더에서 실행하며 프론트 개발 서버 주소는 http://10.0.2.2:8080이다.

## 화면 확인

카카오로 시작하기 → 실제 카카오 계정 로그인·동의 → 취향 설정 또는 지도.
매장 상세 가격 확인 요청 → 옵션/가격/메모 → 요청 보내기.
휴게소 → 커피 리뷰 쓰기 → 매장/별점/내용/사진 → 등록.
리뷰 상세 → 좋아요/다시 눌러 취소 → 댓글 등록. 내 기록에서 내 리뷰를 확인한다.
설정 → 로그아웃 후 인증 쓰기는 거부된다. DB에 리뷰/댓글/좋아요/제보가 남는다.
제보만으로 판매가격을 바꾸지는 않는다. 이벤트/할인/점주 승인·모임/쿠폰/구매 API는 이번 작업 범위가 아니다.

현재 프론트 정책대로 세션은 메모리에만 보관한다. 앱을 완전히 종료하면 다시 로그인한다.
자동 refresh 재시도는 추가하지 않았다. 장시간 사용해 액세스가 만료되면 다시 로그인한다.
갱신 API는 향후 로그인 유지 기능에 사용할 수 있다. 운영의 공유 로그인 호출 제한은 별도 배포 과제다.

## 이전 로그인 구현 시 확인한 결과

- backend 전체: 62개 통과, 별도 DB opt-in 테스트 2개는 기본 실행에서 생략.
- 실제 MySQL 기능 테스트 12개, 카카오 응답 대역을 사용한 로그인 연계 테스트 7개 통과.
- frontend 전체 기존 215개 통과. 추가 로그인 보안 2개와 로그인 전환 회귀를 묶은 12개 통과.
- backend/frontend TypeScript 검사 통과.
- 실제 coffee_station_expanded DB에 004까지 적용 후 기존 리뷰 105개 유지.
- 로컬 HTTP 확인: 투썸 리뷰 5개, 가격 비교 10개 매장, 로그인 시작 API 모두 200.
- 카카오 계정 실제 인증/동의와 에뮬레이터 UI는 사용자 확인 필요.

## 2026-11-25 develop 재병합 검증

- frontend 전체 47개 테스트 파일 / 249개 테스트 통과.
- 비동기 로그인 시작 처리를 반영한 로그인 전환·보안 테스트 12개 추가 재확인 통과.
- frontend TypeScript 검사 통과.
- backend 빌드 및 테스트 64개 통과 / DB opt-in 테스트 3개 생략.
- 테스트가 사용하는 Node HTTP 서버와 카카오 응답 대역만으로 검증했으며 실제 카카오 외부 호출은 하지 않았다.
- Docker 엔진이 실행 중이 아니어서 이번 병합에서는 실제 MySQL 테스트와 DB 적재를 실행하지 않았다.
- 기존 haengsin.sql 및 리뷰 시드에 변경이 없고 로그인·리뷰·가격 기능 코드가 보존됐음을 확인했다.
- 실제 Android 빌드·에뮬레이터 화면은 이번 병합 검증에 포함하지 않았다.
- .env는 계속 ignored/untracked이며 로컬 커밋에 포함하지 않는다.
