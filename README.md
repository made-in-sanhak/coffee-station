# ☕ 커피 주유소 (Coffee Station)

> 커피 탐색과 가격 비교부터 이용 기록과 이용경험까지 연결하는 모바일 플랫폼

2026학년도 2학기 산학프로젝트 · **메이드 인 산학 (6팀)**

| 이름 | 역할 |
| --- | --- |
| 박우식 | PM · 프론트엔드 |
| 박준용 | 프론트엔드 |
| 이승훈 | 프론트엔드 · 서기 |
| 방신혁 | 백엔드 |
| 유지성 | 백엔드 · AI |
| 문혁진 | 백엔드 · AI |

---

## 🛠 기술 스택

| 분야 | 기술 |
| --- | --- |
| 프론트엔드 | React Native, TypeScript, TanStack Query, Zustand |
| 백엔드 | Spring Boot, Java 21, JPA, Spring Security (JWT · Kakao OAuth) |
| AI 서버 | Python 3.11, FastAPI, OpenAI API, LangChain, CLOVA OCR |
| DB · 캐시 | PostgreSQL + PostGIS, Redis |
| 인프라 | AWS EC2 · RDS · S3, Docker |
| 협업 | GitHub, Notion |

```
[React Native 앱] ──▶ [Spring Boot] ──▶ [FastAPI AI 서버] ──▶ OpenAI / CLOVA OCR
                          │
                          ├──▶ PostgreSQL(PostGIS) · Redis
                          └──▶ S3 · 카카오 로그인 · 카카오 지도
```
앱은 **Spring 서버만** 호출합니다. AI 서버는 Spring에서만 호출하는 내부 서버입니다.

---

## 🚀 처음 시작하기

```bash
git clone https://github.com/made-in-sanhak/coffee-station.git
cd coffee-station
git checkout develop
cp .env.example .env          # 실제 값은 팀 비공개 채널에서 받아서 채우기
```

### 백엔드
```bash
cd infra
docker compose --env-file ../.env up -d          # PostGIS + Redis 실행
cd ../backend/src/main/resources
cp application-local.yml.example application-local.yml   # 비밀번호 등 채우기
cd ../../../
./gradlew bootRun
```
✅ http://localhost:8080/health → `{"success":true,"data":"ok","message":null}`

### AI 서버
```bash
cd ai-server
python -m venv .venv
source .venv/Scripts/activate      # Windows Git Bash  (Mac: source .venv/bin/activate)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
✅ http://localhost:8000/health → `{"status":"ok"}`

### 프론트엔드
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
├── .github/
│   ├── workflows/                    # GitHub Actions (기능 개발 후 추가)
│   ├── PULL_REQUEST_TEMPLATE.md      ✅
│   └── ISSUE_TEMPLATE/               ✅ feature.md, bug.md
│
├── backend/                          ✅ Spring Boot (Java 21)
│   └── src/main/java/com/coffeestation/
│       ├── CoffeeStationApplication.java   ✅
│       ├── global/                   # 여러 도메인이 같이 쓰는 코드
│       │   ├── HealthController.java ✅
│       │   ├── config/               ✅ SecurityConfig / CORS, 비동기, 스케줄러, Redis
│       │   ├── security/
│       │   │   ├── jwt/              # 토큰 발급·검증
│       │   │   └── oauth/            # 카카오 로그인
│       │   ├── exception/            ✅ 공통 예외 처리
│       │   ├── response/             ✅ 공통 응답 형식 (ApiResponse)
│       │   └── infra/
│       │       ├── s3/               # 사진 업로드
│       │       ├── map/              # 카카오 지도·길찾기 API
│       │       ├── redis/            # 캐싱
│       │       └── aiserver/         # FastAPI 서버 호출
│       └── domain/                   # 기능별 코드
│           ├── user/                 # 회원
│           ├── store/                # 매장, 반경 검색 (PostGIS)
│           ├── menu/                 # 메뉴·가격, 출처·확인일
│           ├── menuimport/           # 메뉴판 사진 등록 요청·확인
│           ├── owner/                # 점주 매장·이벤트 관리
│           ├── event/                # 신메뉴·이벤트 소식
│           ├── receipt/              # 영수증 업로드·검증
│           ├── purchase/             # 구매 기록·캘린더
│           ├── recommend/            # 추천 요청·결과 검증
│           ├── report/               # 월간 통계 계산
│           ├── plan/                 # 요금제·기능 권한
│           └── admin/                # 관리자 검수
│
├── ai-server/                        ✅ Python 3.11 FastAPI
│   └── app/
│       ├── main.py                   ✅ 서버 시작점
│       ├── core/                     ✅ config.py, security.py, logging.py
│       ├── routers/                  ✅ health.py / menuboard, receipt, report, recommend, crawler
│       ├── schemas/                  # 요청·응답 형식 (Pydantic)
│       ├── services/                 # 실제 AI 처리
│       │   ├── menuboard/            # 메뉴판 사진 → 메뉴·가격 추출
│       │   ├── receipt/              # 영수증 결과 정리·메뉴 매칭
│       │   ├── report/               # 통계 → 리포트 문장 생성
│       │   └── recommend/            # 자연어 → 조건 변환, 추천 이유 생성
│       ├── llm/                      # client.py(OpenAI 연결), chains/(LangChain)
│       ├── crawler/                  # 신메뉴·이벤트 수집 (sources/, parsers/, summarizer.py)
│       ├── prompts/                  # 프롬프트 템플릿 (.txt)
│       └── utils/
│
├── frontend/                         ✅ React Native + TypeScript
│   ├── App.tsx                       ✅
│   └── src/
│       ├── api/
│       │   ├── client.ts             ✅ 서버 주소, 토큰 자동 첨부
│       │   ├── endpoints/            # 기능별 API 호출 함수
│       │   └── queries/              # TanStack Query 훅
│       ├── store/                    # Zustand (로그인 상태, 필터 조건)
│       ├── navigation/               # 화면 이동 설정
│       ├── screens/
│       │   ├── auth/                 # 로그인
│       │   ├── map/                  # 지도·반경 검색·가격 비교
│       │   ├── store/                # 매장 상세
│       │   ├── search/               # 자연어 검색·추천 결과
│       │   ├── receipt/              # 영수증 촬영·결과 확인
│       │   ├── calendar/             # 구매 캘린더
│       │   ├── report/               # 월간 리포트
│       │   ├── event/                # 신메뉴·이벤트 소식
│       │   ├── owner/                # 점주 화면
│       │   ├── plan/                 # 요금제
│       │   └── mypage/
│       ├── components/
│       │   ├── common/               # 버튼, 카드, 입력창
│       │   └── map/                  # 가격 마커, 클러스터
│       ├── hooks/                    # 위치 권한 등 공통 로직
│       ├── types/
│       ├── utils/
│       └── assets/
│
├── data/                             ✅ 서버와 무관한 데이터 작업
│   ├── seed/                         # 초기 매장·메뉴 데이터 입력
│   └── ai-eval/                      # AI 정확도 평가 (menuboards/, receipts/, queries/, evaluate.py)
│
├── infra/                            ✅ docker-compose.yml(로컬), docker-compose.prod.yml(배포)
├── docs/                             ✅ api.md, ai-api.md / architecture.md, erd.png, privacy-policy.md
├── .env.example                      ✅
└── .gitignore                        ✅
```

---

## 📐 코드 작성 규칙

### 백엔드 — 도메인 패키지 안의 구조
새 기능은 `domain/기능명/` 아래에 다음 구조로 만듭니다.
```
domain/store/
├── controller/   StoreController.java      # URL 매핑, 요청 검증
├── service/      StoreService.java         # 비즈니스 로직
├── repository/   StoreRepository.java      # JPA
├── entity/       Store.java                # DB 테이블
└── dto/          StoreResponse.java, StoreSearchRequest.java
```
- 응답은 항상 `ApiResponse.ok(data)`로 감쌉니다.
- 오류는 `throw new BusinessException(HttpStatus.NOT_FOUND, "매장을 찾을 수 없습니다.")`로 던지면 공통 처리됩니다.
- 엔티티를 그대로 반환하지 않고 DTO로 바꿔서 반환합니다.
- 여러 도메인이 쓰는 코드(S3, 지도 API, AI 서버 호출)는 `global/infra/`에 둡니다.
- API를 만들면 `docs/api.md`에 한 줄 추가합니다.

### AI 서버
- `schemas/` → `services/` → `routers/` 순서로 만들고 `main.py`에 라우터를 등록합니다.
- `/health`를 제외한 모든 라우터에 `verify_internal_token`을 붙입니다.
- 프롬프트는 코드 안에 쓰지 않고 `prompts/*.txt`로 분리합니다.
- API를 만들면 `docs/ai-api.md`에 한 줄 추가합니다.

### 프론트엔드
| 종류 | 위치 | 이름 예시 |
| --- | --- | --- |
| 화면 | `screens/기능/` | `MapScreen.tsx`, `StoreDetailScreen.tsx` |
| 공통 컴포넌트 | `components/common/` | `PrimaryButton.tsx` |
| API 호출 함수 | `api/endpoints/기능.ts` | `store.ts` → `getNearbyStores()` |
| Query 훅 | `api/queries/` | `useNearbyStores.ts` |
| 커스텀 훅 | `hooks/` | `useLocationPermission.ts` |
| 타입 | `types/` | `store.ts` → `interface Store` |

- 서버 호출은 반드시 `api/client.ts`의 `apiFetch`를 거칩니다. (`fetch` 직접 사용 X)
- 컴포넌트·화면 파일은 PascalCase, 나머지는 camelCase.

### 비밀값
- API 키·비밀번호는 `.env` 또는 `application-local.yml`에만 둡니다. **코드에 직접 쓰지 않습니다.**
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

```
타입: 무엇을 했는지
```
| 타입 | 의미 | 예시 |
| --- | --- | --- |
| `feat` | 새 기능 | `feat: 영수증 OCR 결과 수정 화면 추가` |
| `fix` | 버그 수정 | `fix: 쿠폰 중복 발급 오류 수정` |
| `refactor` | 동작 변화 없는 코드 정리 | `refactor: 매장 조회 서비스 분리` |
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
