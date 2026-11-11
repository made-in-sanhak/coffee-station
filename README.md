# ☕ 커피 주유소 (Coffee Station)

2026학년도 2학기 산학프로젝트 · 메이드 인 산학 (6팀). 현재 저장소는 모의 추천과 리뷰 분석 검증 단계다. 실제 인증·가격 DB·운영 AI 연동은 완료되지 않았다.

## 현재 구조

```text
React Native 앱 → Express/TypeScript 추천·조회 API → 모의 카탈로그
                               ↘ Gemini 조건 추출 코드 (실제 품질 평가 전)
Python 리뷰 작업 → 모의 분석 저장소 / 모의 JSON 파일 → Express 모의 리뷰 조회
```

- `backend/src/modules/recommendations/router.ts`: prepare, confirm, 구조화 조건 직접 추천. 현재 기본 검색은 모의 데이터다.
- `backend/src/modules/reviewSummaries/router.ts`: 모의 매장 990001의 파일 기반 리뷰 분석 조회. 운영 환경에서는 503.
- `ai-jobs/app/review_job.py`: HTTP 서버가 아닌 Python 모의 리뷰 작업. 운영 DB·스케줄러는 없다.
- `frontend/`: React Native 앱. 화면·지도·탭 통합은 담당자와 합의 전이다.

설계와 현재 제한은 [실시간 추천](docs/ai-recommendation.md), [리뷰 분석](docs/ai-review-analysis.md), [개발 계획](docs/ai-development-plan.md)을 참고한다. 배포 상태는 [배포 안내](docs/deployment.md)를 참고한다.

## 로컬 시작

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
npm run dev
```

`/health`는 서버 및 DB 연결 상태를 보고한다. 로컬 MySQL이 필요한 작업에서만 `infra/docker-compose.yml`을 사용한다. 기존 볼륨은 임의 삭제하지 않는다. 모의 리뷰 조회를 수동 시연할 때만 `ai-jobs/scripts/export_mock_review_summary.py`를 먼저 실행한다.

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
