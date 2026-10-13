# ☕ 커피 주유소 (Coffee Station)

> 커피 탐색과 가격 비교부터 이용 기록과 이용경험까지 연결하는 모바일 플랫폼

2026학년도 2학기 산학프로젝트 · **메이드 인 산학 (6팀)**

| 이름 | 역할 |
| --- | --- |
| 박우식 | PM · 프론트엔드 |
| 박준용 | 프론트엔드 |
| 이승훈 | 프론트엔드 · 서기 |
| 방신혁 | 백엔드 · AI 보조 |
| 유지성 | 백엔드 · AI/데이터 처리 |
| 문혁진 | 백엔드 · AI 연동 |

---

## 🛠 기술 스택

| 분야 | 기술 |
| --- | --- |
| 프론트엔드 | React Native, TypeScript, TanStack Query, Zustand |
| 백엔드 | Node.js, Express 5, TypeScript |
| DB | MySQL 8 (로컬: Docker / 배포: AWS RDS) |
| AI · OCR | 외부 AI API (OpenAI), CLOVA OCR |
| 인프라 | AWS EC2 · RDS · S3, Docker |
| 인증 | Kakao OAuth, JWT |
| 협업 | GitHub, Notion |

```
[React Native 앱] ──▶ [Node.js 백엔드 (Express)] ──▶ MySQL
                              │
                              ├──▶ CLOVA OCR · OpenAI API
                              └──▶ S3 · 카카오 로그인 · 카카오 지도
```
앱은 **백엔드 API만** 호출합니다. 외부 API 키는 백엔드에만 두고 앱에는 넣지 않습니다.

---

## 🚀 처음 시작하기

> Windows는 **Git Bash**에서 실행하고, 저장소는 `C:\` 아래 **짧은 영문 경로**에 둡니다. (OneDrive·바탕화면 X)

```bash
git clone https://github.com/made-in-sanhak/coffee-station.git
cd coffee-station
git checkout develop
cp .env.example .env          # 실제 키 값은 팀 비공개 채널에서 받아서 채우기
```

### 백엔드
준비물: Node.js 20 LTS 이상, Docker Desktop (실행 중이어야 함)
```bash
cd infra
docker compose --env-file ../.env up -d     # 로컬 MySQL 실행
docker ps                                   # coffee-mysql 이 보이면 OK

cd ../backend
npm install
npm run dev                                 # 코드를 저장하면 자동으로 재시작됩니다
```
✅ http://localhost:8080/health → `{"success":true,"data":{"server":"ok","db":"ok"},"message":null}`

> `"db":"down"`이면 MySQL이 안 떠 있거나 `.env`의 DB 값이 다른 것입니다.

| 명령 | 용도 |
| --- | --- |
| `npm run dev` | 개발 서버 (자동 재시작) |
| `npm run typecheck` | 타입 오류 검사 (PR 올리기 전에 실행) |
| `npm run build` → `npm start` | 배포용 빌드·실행 |

### 프론트엔드
준비물: Node.js, Android Studio (Android SDK + 에뮬레이터, `ANDROID_HOME` 환경 변수 등록)
```bash
cd frontend
npm install
npm run android                     # Android 에뮬레이터를 먼저 켜두기
```
✅ 에뮬레이터에 앱 화면이 뜨면 성공

---

## 📁 폴더 구조

> **지금 저장소에는 ✅ 표시된 것만 있습니다.**
> 나머지는 **해당 기능을 맡은 사람이 첫 코드를 쓸 때** 아래 위치·이름 그대로 만듭니다.
> 빈 폴더만 미리 만들어 올리지 않습니다.

```
coffee-station/
├── .github/                          ✅ PR 템플릿, 이슈 템플릿(feature, bug)
│
├── backend/                          ✅ Node.js + Express + TypeScript
│   ├── package.json                  ✅
│   ├── tsconfig.json                 ✅
│   ├── Dockerfile                    ✅
│   ├── db/                           # schema.sql (ERD 확정 후), 마이그레이션
│   └── src/
│       ├── server.ts                 ✅ 서버 시작점
│       ├── app.ts                    ✅ 미들웨어·라우터 등록
│       ├── config/                   ✅ env.ts(환경변수), db.ts(MySQL 연결)
│       ├── common/                   ✅ response.ts(공통 응답), AppError.ts(공통 오류)
│       ├── middlewares/              ✅ errorHandler.ts / auth.ts(JWT 검증·권한)
│       ├── routes/                   ✅ health.ts
│       ├── infra/                    # 외부 API 호출: s3.ts, kakao.ts, ocr.ts, ai.ts
│       └── modules/                  # 기능별 코드
│           ├── auth/                 # 카카오 로그인, JWT 발급
│           ├── user/                 # 회원
│           ├── cafe/                 # 카페 검색, 위치 기반 조회
│           ├── menu/                 # 메뉴·가격, 가격 비교, 출처·확인일
│           ├── receipt/              # 영수증 등록, OCR, 중복 검사
│           ├── purchase/             # 구매 기록
│           ├── coupon/               # 쿠폰 발급·사용·만료
│           ├── review/               # 리뷰·커뮤니티
│           ├── owner/                # 사장님 매장·메뉴·가격·이벤트 관리
│           ├── recommend/            # AI 추천, 결과 검증
│           └── admin/                # 관리자 검수
│
├── frontend/                         ✅ React Native + TypeScript
│   ├── App.tsx                       ✅
│   └── src/
│       ├── api/
│       │   ├── client.ts             ✅ 서버 주소, 토큰 자동 첨부, 공통 응답 처리
│       │   ├── endpoints/            # 기능별 API 호출 함수
│       │   └── queries/              # TanStack Query 훅
│       ├── store/                    # Zustand (로그인 상태, 필터 조건)
│       ├── navigation/               # 화면 이동 설정
│       ├── screens/
│       │   ├── auth/                 # 로그인
│       │   ├── map/                  # 지도·주변 카페 탐색
│       │   ├── cafe/                 # 카페 상세·메뉴 가격 비교
│       │   ├── recommend/            # AI 추천 조건 입력·결과
│       │   ├── receipt/              # 영수증 촬영·OCR 결과 확인·수정
│       │   ├── purchase/             # 구매 기록
│       │   ├── coupon/               # 쿠폰함
│       │   ├── community/            # 리뷰·커뮤니티
│       │   ├── owner/                # 사장님 전용 페이지
│       │   └── mypage/
│       ├── components/
│       │   ├── common/               # 버튼, 카드, 입력창
│       │   └── map/                  # 가격 마커
│       ├── hooks/                    # 위치 권한 등 공통 로직
│       ├── types/
│       ├── utils/
│       └── assets/
│
├── ai-server/                        ✅ Python FastAPI (사용 여부 확정 전)
├── data/                             ✅ 초기 카페·메뉴 데이터(seed/), AI·OCR 정확도 평가(ai-eval/)
├── infra/                            ✅ docker-compose.yml(로컬 MySQL), docker-compose.prod.yml(배포)
├── docs/                             ✅ api.md(API 명세), erd.png, architecture.md
├── .env.example                      ✅
└── .gitignore                        ✅
```

---

## 📐 코드 작성 규칙

### 백엔드 — 기능 모듈 구조
새 기능은 `src/modules/기능명/` 아래에 다음 파일로 만듭니다.
```
modules/cafe/
├── cafe.routes.ts        # URL 연결
├── cafe.controller.ts    # 요청 값 꺼내기·검사, 응답 보내기
├── cafe.service.ts       # 비즈니스 로직, 트랜잭션
├── cafe.repository.ts    # SQL 쿼리
└── cafe.types.ts         # 타입 정의
```

예시
```ts
// cafe.routes.ts
import { Router } from 'express';
import { getCafe } from './cafe.controller';
const router = Router();
router.get('/:id', getCafe);
export default router;

// cafe.controller.ts
import type { Request, Response } from 'express';
import { ok } from '../../common/response';
import * as cafeService from './cafe.service';
export const getCafe = async (req: Request, res: Response) => {
  const cafe = await cafeService.findById(Number(req.params.id));
  res.json(ok(cafe));
};

// cafe.service.ts
import { AppError } from '../../common/AppError';
import * as cafeRepository from './cafe.repository';
export const findById = async (id: number) => {
  const cafe = await cafeRepository.findById(id);
  if (!cafe) throw new AppError(404, '카페를 찾을 수 없습니다.');
  return cafe;
};

// app.ts 에 등록
app.use('/api/cafes', cafeRouter);
```

- 응답은 항상 `res.json(ok(data))`로 보냅니다.
- 오류는 `throw new AppError(상태코드, '메시지')`로 던지면 공통 형식으로 응답됩니다. `try/catch`로 직접 응답하지 않습니다.
- SQL은 반드시 `?` 자리표시자를 씁니다. 문자열을 이어 붙여 쿼리를 만들지 않습니다. (SQL 인젝션 방지)
- 영수증 등록과 쿠폰 발급처럼 여러 쿼리가 함께 성공해야 하는 작업은 트랜잭션으로 묶습니다. (`config/db.ts` 주석 참고)
- 외부 API 호출(S3, 카카오, OCR, AI)은 `src/infra/`에 두고 모듈에서 가져다 씁니다.
- API를 만들면 `docs/api.md`에 한 줄 추가합니다.
- URL은 `/api/복수형-명사` (예: `/api/cafes`, `/api/receipts`)

### 프론트엔드
| 종류 | 위치 | 이름 예시 |
| --- | --- | --- |
| 화면 | `screens/기능/` | `MapScreen.tsx`, `CafeDetailScreen.tsx` |
| 공통 컴포넌트 | `components/common/` | `PrimaryButton.tsx` |
| API 호출 함수 | `api/endpoints/기능.ts` | `cafe.ts` → `getNearbyCafes()` |
| Query 훅 | `api/queries/` | `useNearbyCafes.ts` |
| 커스텀 훅 | `hooks/` | `useLocationPermission.ts` |
| 타입 | `types/` | `cafe.ts` → `interface Cafe` |

- 서버 호출은 반드시 `api/client.ts`의 `apiFetch`를 거칩니다. (`fetch` 직접 사용 X)
- 컴포넌트·화면 파일은 PascalCase, 나머지는 camelCase.

### 공통 응답 형식 (앱 ↔ 백엔드)
```json
{ "success": true,  "data": { "...": "..." }, "message": null }
{ "success": false, "data": null, "message": "카페를 찾을 수 없습니다." }
```

### 비밀값
- API 키·비밀번호는 `.env`에만 둡니다. **코드에 직접 쓰지 않습니다.**
- 새 환경변수를 추가하면 `.env.example`에도 **이름만** 추가합니다.

---

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

## 🧯 자주 나는 문제

| 증상 | 해결 |
| --- | --- |
| `docker: command not found` / `docker_engine` 오류 | Docker Desktop을 실행해 **Engine running** 상태인지 확인 |
| `/health`에서 `"db":"down"` | `docker ps`로 coffee-mysql 확인, `.env`의 `DB_*` 값 확인 |
| MySQL 실행 시 3306 포트 사용 중 | PC에 MySQL이 따로 실행 중 → 서비스 중지 또는 `.env`의 `DB_PORT`와 docker-compose 포트를 3307로 변경 |
| `.env` 비밀번호를 바꿨더니 DB 접속 실패 | DB는 처음 만들 때 비밀번호가 정해짐 → `cd infra && docker compose down -v` 후 다시 `up -d` (로컬 데이터 삭제됨) |
| `npm run android` 시 `SDK location not found` | Android Studio 설치 후 `ANDROID_HOME` 환경 변수 등록, Git Bash 새로 열기 |
| `.env`를 실수로 커밋함 | `git rm --cached .env` 후 커밋. 이미 push했다면 해당 키는 발급처에서 재발급 |
