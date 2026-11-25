# ☕ 커피 주유소 (Coffee Station)

2026학년도 2학기 산학프로젝트 · 메이드 인 산학 (6팀). React Native 앱과 Express/MySQL을 사용합니다. 카카오 서비스 인증, 매장·메뉴 조회, 리뷰·댓글·좋아요·가격 비교 API를 제공하며 운영 AI·점주·구매 기능 등은 별도 범위입니다.

## 현재 구조

```text
React Native 앱 → Express/TypeScript 인증·조회·리뷰 API → MySQL
                               ↘ 개발용 DB 추천 / 모의 카탈로그
                               ↘ Gemini 조건 추출 코드 (실제 품질 평가 전)
Python 리뷰 작업 → 모의 분석 저장소 / 모의 JSON 파일 → Express 모의 리뷰 조회
```

- `backend/src/modules/recommendations/router.ts`: prepare, confirm, 구조화 조건 직접 추천. 현재 기본 검색은 모의 데이터다.
- `backend/src/modules/reviewSummaries/router.ts`: 모의 매장 990001의 파일 기반 리뷰 분석 조회. 운영 환경에서는 503.
- `ai-jobs/app/review_job.py`: HTTP 서버가 아닌 Python 모의 리뷰 작업. 운영 DB·스케줄러는 없다.
- `frontend/`: React Native 앱. 화면·지도·탭 통합은 담당자와 합의 전이다.

설계와 현재 제한은 [실시간 추천](docs/ai-recommendation.md), [리뷰 분석](docs/ai-review-analysis.md), [개발 계획](docs/ai-development-plan.md)을 참고한다. 배포 상태는 [배포 안내](docs/deployment.md)를 참고한다.

## 팀 공통 로컬 실행

Node.js 22.11 이상과 Docker Desktop은 최초 한 번 설치합니다. 최신 develop을 작업 폴더에 반영한 뒤
**저장소 루트 또는 backend에서 같은 명령 한 개**로 DB와 백엔드를 준비합니다.

```powershell
npm.cmd run dev
```

필요한 의존성 설치, 로컬 MySQL 확인/생성, 기본 .env 생성, DB 스키마·회원 이전,
행신 매장 21곳·메뉴/가격 옵션·매장별 리뷰 5개를 자동 준비하고 API를 시작합니다.
다음 실행부터 적용 이력을 확인하며 기존 회원·리뷰·가격은 유지합니다. 바뀌는 기존 DB는 .local/db-backups에 먼저 백업합니다.
SQL SOURCE나 db:community를 fetch마다 따로 실행하지 않아도 됩니다. git fetch 자체가 실행 작업을 하는 것은 아닙니다.

실제 카카오 로그인은 .env의 팀/개인 카카오 설정이 한 번 필요하며 키를 Git으로 공유하지 않습니다.
이 명령은 DB·백엔드를 실행합니다. 프론트/에뮬레이터는 [프론트 실행](frontend/README.md)을 따릅니다.
자세한 자동화·백업·옵션은 [개발 자동 실행](docs/development-startup.md)을 참고하세요.

## 모의 MVP 실행

현재 실행 가능한 발표용 최소 흐름과 검증 명령은 [로컬 MVP 실행](docs/mvp-local-run.md)을 참고하세요.
`backend`의 `npm run dev:mvp`는 모의 자료, `npm run dev:mvp:db`는 기존 MySQL 시연 자료를 사용합니다.
두 모드 모두 외부 AI 호출 없이 선택 검색·조건 확인·추천을 실행합니다.

중간발표 준비 순서와 단계별 실행 프롬프트는 [AI 추천 MVP 계획](docs/midterm-ai-mvp-plan.md)을 따른다. Python 리뷰 Agent의 실제 서비스 연결은 이번 발표용 추천의 선행 조건이 아니다.

Node.js, Python 3.11 이상을 사용한다. `.env.example`을 복사해 필요한 값만 채우고 비밀값을 저장소에 넣지 않는다. 모의 추천 테스트에는 Gemini 키·실제 DB가 필요 없다.

```powershell
cd backend
npm install
npm run build
node --test tests/recommendations.cjs
npm run dev:mvp
```

`/health`는 서버 및 DB 연결 상태를 보고한다. 일반 개발 실행은 준비가 끝난 후 API를 열며 자동 생성 MySQL에는 `infra/docker-compose.dev.yml`을 사용한다. 기존 `infra/docker-compose.yml` 환경도 연결값을 유지하여 사용할 수 있다. 기존 볼륨은 임의 삭제하지 않는다. 모의 리뷰 조회를 수동 시연할 때만 `ai-jobs/scripts/export_mock_review_summary.py`를 먼저 실행한다.

Python 리뷰 테스트는 `ai-jobs`에서 `requirements.txt` 설치 후 다음 명령으로 실행한다.

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -p 'test_*.py'
```

프런트 실행 방법은 [frontend/README.md](frontend/README.md)를 참고한다. `NODE_ENV=production`에서는 현재 추천·모의 리뷰 조회가 차단된다.

## 현재 폴더

```text
backend/             Express API, 추천 서비스·테스트, 행신 staging SQL
  src/modules/recommendations/  추천 라우터·서비스·추출·Repository·정책 모듈
  src/modules/reviewSummaries/  리뷰 조회 라우터·산출물 검증
frontend/            React Native 앱과 화면
ai-jobs/           Python 리뷰 작업·저장소·테스트, 모의/자료 검증 노트북
infra/               로컬 MySQL과 Express 운영 Compose
backend/sql/staging/haengsin/ 승인된 행신 비교 자료 (현재 판매 추천 아님)
docs/                추천·리뷰 분석·개발 계획·배포·API 안내
```

## 📐 백엔드 코드 작성 규칙 (Node.js · Express 5 · TypeScript)

### 폴더와 파일

새 기능은 `backend/src/modules/기능명/` 아래에 만든다. 라우터 파일 이름은 `router.ts`로 통일하고, 로직이 길어지면 같은 폴더에 역할별 파일로 나눈다.

```text
backend/src/
├── app.ts               라우터 등록 (notFound·errorHandler 는 항상 맨 마지막)
├── server.ts            서버 시작
├── config/              env.ts(설정), db.ts(MySQL 연결 풀), aiPolicy.ts
├── common/              AppError.ts(의도한 오류), response.ts(ok·fail 응답)
├── middlewares/         errorHandler.ts(notFound·공통 오류 처리)
├── modules/기능명/       router.ts + service.ts·repository.ts 등 (새 기능은 여기)
└── routes/              기존 health·stores·cafes 라우터 (새 라우터는 추가하지 않음)
```

| 종류 | 위치 | 이름 예시 |
| --- | --- | --- |
| 라우터 | `src/modules/기능명/router.ts` | `modules/cafes/router.ts` (`export default router`) |
| 비즈니스 로직 | `src/modules/기능명/` | `recommendations/service.ts` |
| DB 조회 | `src/modules/기능명/` | `recommendations/mysqlRepository.ts` |
| 테스트 | `backend/tests/` | `cafeMapHttp.cjs` |

- 파일·폴더 이름은 camelCase를 쓴다.
- `src/routes/`의 기존 라우터를 `modules/`로 옮기는 것은 기능 변경과 섞지 않고 별도 `refactor` PR로 한다.

### 라우터 등록과 경로

- `app.ts`에 `app.use('/api/기능명', 라우터)`로 등록한다. `app.use(notFound)`, `app.use(errorHandler)`보다 반드시 위에 둔다.
- 새 API는 `/api/` 접두사를 기본으로 한다. 앱이 이미 다른 경로로 호출하는 경우(`/health`, `/stores`, `/auth`)만 예외로 두고, 그 이유를 `docs/api.md`에 적는다.
- 같은 접두사(예: `/api/cafes`)에 라우터가 여러 개 붙어 있으면, 같은 경로를 정의한 경우 먼저 등록된 라우터가 처리하고 뒤의 것은 실행되지 않는다. 새 경로를 추가하기 전에 같은 접두사의 다른 라우터와 경로가 겹치지 않는지 확인한다.

### 응답과 오류

- 성공 응답은 항상 `res.json(ok(data))`로 보낸다. 형식은 `{ success, data, message }`이며 `frontend/src/api/client.ts`의 `ApiResponse`와 같다.
- 의도한 오류는 `throw new AppError(상태코드, '사용자에게 보여줄 메시지')`로 던진다. Express 5는 `async` 핸들러의 오류도 `errorHandler`로 넘기므로 `try/catch`로 감싸 직접 응답하지 않는다.
- 상태 코드는 다음 기준을 따른다.
  - 400: 요청 값 오류
  - 401: 인증 실패
  - 404: 대상 없음
  - 409: 상태 충돌
  - 422: 지원하지 않는 조건
  - 503: DB·외부 서비스를 쓸 수 없음
- 내부 오류 문구, SQL, 스택은 응답에 넣지 않는다. 예상하지 못한 오류는 `errorHandler`가 500으로 바꾼다.

### 설정과 비밀값

- `process.env`를 기능 코드에서 직접 읽지 않는다. `src/config/env.ts`의 `loadSettings`에 항목을 추가하고, 코드에서는 `env.항목`으로 쓴다.
- 새 환경변수는 루트 `.env.example`에 **이름만** 추가한다. 실제 값은 `.env`(Git 제외)에만 두고 팀 비공개 채널로 공유한다. 운영 서버는 환경변수(추후 Secrets Manager)로 주입한다.
- API 키·클라이언트 시크릿·토큰·인가 코드는 로그(`console.*`)와 응답에 남기지 않는다. 외부 API 실패는 오류 코드만 기록한다.
- 시크릿이 필요한 외부 호출은 백엔드에서만 한다. 프론트 코드에 시크릿을 넣지 않는다.

### DB (MySQL)

- `src/config/db.ts`의 `pool`을 쓰고, 값은 반드시 `?` 자리표시자로 넘긴다. 문자열을 이어 붙여 SQL을 만들지 않는다.
- 여러 쓰기를 함께 처리해야 하면 `db.ts` 주석의 트랜잭션 패턴(`beginTransaction` → `commit`/`rollback` → `release`)을 따른다.
- 스키마·시드 SQL은 `backend/sql/`에 둔다.

### 테스트와 확인

- 테스트는 `backend/tests/이름.cjs`에 `node:test`로 작성하고, 빌드된 `../dist/...`를 `require`한다.
- 파일 맨 위에서 `process.env.NODE_ENV = 'test'`를 설정한다. 이렇게 하면 개발자의 `.env`를 읽지 않으므로, 필요한 설정값은 테스트 안에서 직접 넣는다.
- 기본 테스트는 DB·외부 API 대역을 사용한다. 실제 MySQL 검증은 명시적으로 선택한 별도 테스트 DB와 CI에서 실행하며, 앱 DB를 초기화하지 않는다.
- PR 전에 `backend`에서 다음 두 명령이 통과해야 한다.

```powershell
npm run typecheck   # 타입 검사 (strict)
npm test            # 빌드 후 tests/*.cjs 전체 실행
```

- API를 추가하거나 바꾸면 `docs/api.md`에 요청·응답·오류를 적는다.

## 🌿 브랜치 · 커밋 규칙

| 브랜치 | 용도 |
| --- | --- |
| `main` | 발표·배포용. 발표 전에만 develop → main 머지 |
| `develop` | 개발 통합 브랜치. 모든 PR의 대상 |
| `feature/이슈번호-기능명` | 기능 개발 (예: `feature/12-kakao-login`) |
| `fix/이슈번호-내용` | 버그 수정 |
| `docs/내용` | 문서 작업 |
| `chore/내용` | 설정·환경 작업 |

```
타입: 무엇을 했는지
```
| 타입 | 의미 | 예시 |
| --- | --- | --- |
| `feat` | 새 기능 | `feat: 영수증 OCR 결과 수정 화면 추가` |
| `fix` | 버그 수정 | `fix: 쿠폰 중복 발급 오류 수정` |
| `refactor` | 동작 변화 없는 코드 정리 | `refactor: 카페 조회 서비스 분리` |
| `docs` | 문서 | `docs: API 명세에 쿠폰 API 추가` |
| `chore` | 설정·빌드·패키지 | `chore: TanStack Query 설치` |
| `test` | 테스트 | `test: 영수증 중복 검사 테스트 추가` |

### 작업 흐름
1. GitHub에 이슈 만들기 (예: `#12 카카오 로그인 화면`)
2. `git checkout develop && git pull origin develop`
3. `git checkout -b feature/12-kakao-login`
4. 작업 → 커밋 → `git push -u origin feature/12-kakao-login`
5. PR 생성 (develop ← feature), 본문에 `closes #12`
6. 팀원 1명 승인 후 머지, 브랜치 삭제

---
