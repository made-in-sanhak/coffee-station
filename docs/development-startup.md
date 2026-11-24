# 팀 공통 개발 실행

## 실행

Node.js 22.11+와 Docker Desktop 설치 후 저장소 루트 또는 backend에서 실행한다.

```powershell
npm.cmd run dev
```

프론트와 Android SDK/에뮬레이터 실행 절차는 기존 frontend/README.md를 사용한다.
최신 develop으로 작업 트리를 업데이트한 다음 위 명령을 사용한다. fetch만으로 실행 코드나 DB가 바뀌지는 않는다.

## 자동으로 하는 일

1. 루트 .env가 없으면 .env.example에서 로컬 설정을 생성한다. 비밀번호·JWT는 각 PC에서 무작위로 만들고 Git에서 제외한다.
2. backend lock 파일이 달라졌거나 의존성이 없으면 npm ci를 실행한다.
3. 설정된 로컬 DB가 실행 중이면 재사용한다. 해당 포트의 기존 MySQL 컨테이너가 꺼져 있으면 먼저 다시 켜고, 없을 때만 개발용 Docker Compose로 새 MySQL을 준비한다.
   Windows에서 Docker Desktop이 설치되어 있고 꺼져 있으면 시작을 시도한다.
4. 개발 서버가 요청을 받기 전에 DB를 준비한다.
   - 신규 DB의 기본 schema 및 users/refresh_tokens
   - 기존 로컬 인증·리뷰 작성자 ID의 005 이전
   - users를 참조하는 006 커뮤니티 테이블
   - 행신 매장·메뉴·가격 시드와 매장별 생성 리뷰 5개
5. 준비에 성공한 뒤 HTTP 서버를 연다. 실패하면 원인을 출력하고 API를 열지 않는다.

초기 데이터는 매장 21곳·가격 옵션 2740개·생성 리뷰 105개다. 사용자 작성 리뷰는 별도로 추가된다.
빈 DB로 시작해도 GET /api/reviews?cafeId=9001에서 리뷰 5개를 확인할 수 있다.
다른 PC에서 작성한 개인 DB 기록까지 공유하려면 같은 백엔드/공용 DB를 사용해야 한다.

## 한 번 필요한 개인 설정

실제 카카오 로그인을 사용하려면 .env의 KAKAO_REST_API_KEY/KAKAO_REDIRECT_URI 및
콘솔에서 사용 중인 KAKAO_CLIENT_SECRET을 설정한다. 지도 키도 팀 앱 설정에 맞춘다.
Git에 키를 넣거나 다른 PC의 비밀 파일을 복사해서 배포하지 않는다.
첫 실행에는 공개 조회 API가 준비되지만 카카오 설정이 없으면 실제 로그인은 사용할 수 없다.

기존 .env의 DB 접속값·실제 키는 보존한다. placeholder/빈 JWT는 로컬 무작위 키로 채운다.
USE_MOCK_API가 비어 있으면 false로 채워 서비스 API를 사용한다. 명시한 true는 유지한다.
기존 DB 비밀번호가 잘못된 경우에는 내용을 추측해 바꾸거나 볼륨을 삭제하지 않고 오류로 알린다.
Docker 실행에 관리자 승인이나 설치가 필요한 환경은 직접 해당 단계를 완료해야 한다.

## 데이터 보존 및 반복 실행

- 적용 버전은 app_migrations에 기록하며 초기 가격/리뷰 시드는 파일 내용 버전으로 구분한다.
- 없는 조합만 추가하고 기존 OWNER 가격·리뷰·회원·좌표는 덮어쓰지 않는다.
- 초기 seed의 브랜드 이름을 중복 제거하여 빈 DB에서도 브랜드가 중복 생성되지 않는다.
- DB 준비 잠금으로 중복 실행을 직렬화한다.
- 기존 DB에 적용할 단계가 있으면 .local/db-backups에 SQL 백업을 만든다. 백업 실패 시 적용하지 않는다.
- SQL 백업은 사진 바이너리와 원래 날짜를 포함하며 .local은 Git에서 제외한다.
- 005 회원 이전의 적용/재실행 규칙은 local-login-integration.md를 참고한다.
- DDL은 전체 롤백을 보장하지 않는다. 단계별 기록과 반복 적용 가능한 SQL로 중단 후 재시작을 지원한다.
- 개인 데이터가 든 백업을 Git이나 외부 서비스에 올리지 않는다. 복원은 대상 DB를 확인한 관리 작업으로만 실행한다.

기존 가격을 수정하는 변경은 별도 데이터 갱신 migration으로 만든다. 초기 시드가 사용자의 가격을 강제로 대체하지 않는다.
새 migration을 추가하면 실행 manifest에도 순서를 등록하고 빈 DB/기존 DB 테스트를 함께 추가한다.

## 옵션

- DEV_DB_AUTO_SETUP=false: src/server.ts에서 자동 DB 적용을 끈다.
- DEV_SEED_HAENGSIN=false: 테이블·인증 이전만 준비하고 행신 생성 데이터를 넣지 않는다.
- 자동 준비는 development 및 로컬 DB 호스트에 한정한다. production에서는 실행하지 않는다.
- 모의 데이터만 필요하면 backend에서 npm run dev:mvp를 사용한다. Docker/DB 자동 준비를 생략한다.
- 이미 사용하는 MySQL을 연결하려면 기존 .env의 DB_HOST/PORT/NAME/USER/PASSWORD를 유지한다.
- 새 Docker DB는 프로젝트 경로별 이름의 Compose 프로젝트·볼륨 및 127.0.0.1 포트 바인딩을 사용한다.

## 확인

```powershell
curl.exe http://localhost:8080/health
curl.exe "http://localhost:8080/api/reviews?cafeId=9001"
```

DB 연결이 안 되거나 준비에 실패한 상태를 정상 실행으로 표시하지 않는다.
부족한 권한·기존 고정 매장 ID 충돌·원격 DB 연결처럼 자동으로 안전하게 해결할 수 없는 경우에는
오류와 백업 위치를 보여 준다. 볼륨 삭제나 회원 연결 추측으로 우회하지 않는다.
