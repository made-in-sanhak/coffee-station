# 로컬 프런트·추천 MVP 통합 실험

> 작성 당시 통합 검증 기록. 현재 검증 절차와 문서 분류는 [문서 안내](README.md)를 따른다.

2026-11-11. `feature/14-midterm-recommendation`에서 만든 `codex/mvp-frontend-integration`에서 PR #16의 `feature/15-frontend-integration`을 병합했다. 팀원의 Android 환경에서 검증하기 위한 별도 공유 브랜치다. 기존 PR #16/#17과 develop은 변경하지 않는다.

## 다른 PC에서 받기

상대방 PC의 저장소 루트에서 먼저 `git status --short`로 변경이 없는지 확인한다. 변경이 있으면 덮어쓰지 말고 별도로 보존한다.

```powershell
git fetch origin
git switch --track origin/codex/mvp-frontend-integration
cd frontend
npm ci
```

이미 로컬에 같은 브랜치가 있으면 `git switch codex/mvp-frontend-integration` 후 `git pull --ff-only`를 사용한다. `.env`는 Git으로 공유하지 않는다. 이 모의 추천 테스트의 설정은 아래 환경변수만으로 충분하다. Android Studio에서는 **이 체크아웃의 frontend/android**를 열고 기존 SDK/JDK 설정을 사용한다. 다른 경로의 앱을 실행하지 않도록 주의한다.

## 변경과 경계

- 충돌은 `frontend/jest.config.js` 1개. 프런트의 30초 제한과 RN 확장 패키지 변환 규칙, 기존 lucide CommonJS 매핑을 유지했다.
- 기존 로그인·지도·탭·추천 화면을 보존했다. 로그인 화면에 `__DEV__` 전용 MVP 테스트 진입점을 추가했다. 릴리스에는 버튼과 경로가 없다.
- 프런트의 기존 목적/취향/이동시간 요청과 Express MVP의 메뉴/온도/예산 계약이 다르므로 자동 변환하지 않는다. 별도 개발 화면과 `api/endpoints/midterm.ts`에서 현재 MVP 계약을 사용한다.
- 임시 매장 ID를 실제 카페/지도 ID로 변환하지 않으며 지도·상세 화면으로 연결하지 않는다. 실제 서비스 화면 통합은 별도 협의 대상이다.
- apiFetch의 미리보기 토큰 POST 차단과 인증 경계를 수정하지 않았다. 로그인하지 않은 초기 화면에서 테스트한다. 미리보기 로그인 상태에서는 POST가 차단될 수 있다.
- PR #16에는 사전 생성된 Android JS 번들과 drawable 리소스가 다수 포함돼 있다. 이번 실험에서 삭제하지 않았다. 릴리스 패키징 전에 프런트 담당자와 재생성/중복 리소스 여부를 확인해야 한다.

## 실행

첫 번째 PowerShell, 저장소 루트에서:

```powershell
cd backend
$env:NODE_ENV='development'
$env:EXTRACTION_MODE='mock'
$env:HOST='0.0.0.0'
$env:PORT='8080'
npm run dev
```

실제 DB/Python 서버/Gemini 키는 이 추천 테스트에 필요 없다. `/health`는 별도로 DB 상태를 검사하므로 DB 미연결 health 응답과 MVP 검색 성공은 구분한다.

Android SDK/JDK가 설치된 환경에서 Android Studio Device Manager로 에뮬레이터를 시작한다. 두 번째 터미널은 `frontend`에서 `npm start`, 세 번째 터미널은 같은 폴더에서 `npm run android`를 실행한다. Debug 앱과 Metro를 사용한다. 기존 release/demo APK에는 이번 개발 화면이 없다.

API 기본 주소는 `http://10.0.2.2:8080`이다. 앱에 저장된 서버 주소가 있으면 우선 사용되므로 새 에뮬레이터/앱 데이터 초기화 또는 설정값 확인이 필요하다. 사용자 앱 데이터를 자동 삭제하지 않는다. 실제 휴대폰은 이 주소로 연결되지 않는다.

로그인 화면의 **개발용 MVP 추천 테스트 (로그인 불필요)**를 누른다. 카카오 로그인/지도는 열 필요 없다.

1. 기본 아메리카노/ICE/4천 원 이하에서 선택 조건 검색: `demo-1` 3000원, `demo-3` 4000원에 해당하는 2개 옵션.
2. 기본 자연어 `4천 원 이하 아이스 아메리카노 추천해줘.` 준비: AWAITING_CONFIRMATION, 추출 mock.
3. 화면 조건을 검토하고 확인 후 추천: 선택 조건 검색과 같은 결과.
4. 요청 문장을 수정하면 이전 확인 버튼과 결과가 사라지는지 확인.
5. `5천 원 미만 따뜻한 카페라떼 추천해줘.` 준비·확인: HOT 카페라떼 4900원 1개.
6. 미지원 문장은 NEEDS_CLARIFICATION이며 확인 불가. 오류/빈 결과 시 조건을 직접 수정한다.

기본 mock 모드에서 자연어는 등록된 두 문장만 지원한다. 실제 Gemini 전환·지도·DB 호출은 별도 승인 후 진행한다. 로컬 제한은 분당 10요청이므로 429면 잠시 기다린다. 서버 재시작 후 제안은 다시 준비한다.

## 검증

- backend 빌드 및 모의 HTTP를 포함한 테스트 28개 통과.
- 프런트 타입 검사 성공, 전체 Jest 39 suites/187 tests 통과. 화면 테스트는 주입 응답으로 조건 검색/제안 무효화/수정 후 확인을 검증한다. 릴리스에서 개발 경로가 없는지도 검사한다.
- 실제 Gemini/지도/DB는 호출하지 않았다.
- 현재 환경에서 adb/기본 Android SDK를 찾지 못해 APK 빌드·에뮬레이터 표시·기기→Express 왕복은 미검증이다. 자동 테스트 통과와 기기 통합 완료를 구분한다.
- 기존 추천 화면의 `/api/recommendations` 직접 호출은 현재 MVP 계약과 호환되지 않으므로 위 개발 화면만 이번 로컬 검증 대상으로 삼는다.
- 가져온 브랜치의 공백 경고 2건(`parkSessionFlow.test.ts` 마지막 빈 줄, 폰트 라이선스 OFL.txt 후행 공백)은 그대로 두었다. 폰트 라이선스를 이번 실험에서 수정하지 않는다. 이번 추가 수정의 공백 검사는 통과했다.

이 브랜치는 통합 실험용이며 운영 배포/머지 준비 완료를 의미하지 않는다. 상대방은 기기 종류, 실행한 커밋, 화면 오류 또는 기대 결과 확인 여부를 공유한다. 오류 로그에 API 키·토큰은 포함하지 않는다.
