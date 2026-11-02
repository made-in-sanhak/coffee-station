# Coffee Station 프런트엔드

React Native와 TypeScript로 작성한 커피 매장 탐색 앱입니다. 카카오 OAuth로 받은 인증 코드를 백엔드와 교환하고, 인증 상태에 따라 로그인 화면 또는 지도 화면을 표시합니다.

## 개발 환경

- Node.js 22.11 이상
- JDK 21
- Android SDK Platform 37, Build Tools 37.0.0
- NDK 27.1.12297006, CMake 3.22.1

Windows에서는 프로젝트와 Gradle 캐시를 짧은 영문 경로에 두는 것을 권장합니다. `JAVA_HOME`은 JDK 21, `ANDROID_HOME`은 설치한 Android SDK 경로로 설정합니다.

## 환경 설정

저장소 루트의 `.env.example`을 참고해 로컬 `.env`를 구성합니다. 실제 값은 버전 관리에 포함하지 않습니다.

| 변수 | 용도 |
|---|---|
| `KAKAO_REST_API_KEY` | 카카오 로그인 앱 식별자 |
| `KAKAO_REDIRECT_URI` | 카카오 콘솔에 등록한 OAuth Redirect URI |
| `KAKAO_MAP_JS_KEY` | 카카오 지도 JavaScript 키 |
| `USE_MOCK_API` | 기존 임시 매장 데이터 사용 여부. 실제 API 연동은 `false` |

카카오 지도 Web 플랫폼 도메인은 `KakaoMapView.tsx`의 `baseUrl`과 일치해야 합니다. API 기본 주소는 `src/api/client.ts`에서 설정하며 Android 에뮬레이터의 PC 접근 주소는 `10.0.2.2`입니다. 백엔드 API 계약은 저장소의 `docs/api.md`를 확인합니다.

## 실행 및 검사

`frontend` 폴더에서 실행합니다.

```sh
npm ci
npm run typecheck
npm run lint
npm test -- --runInBand
```

에뮬레이터를 켠 뒤, 첫 터미널에서 `npm start`, 두 번째 터미널에서 `npm run android`를 실행합니다. Android 17의 개발 서버 접근 권한 요청은 Metro 연결에 사용됩니다.

Android Studio에서는 `frontend/android` 폴더를 열고 Gradle Sync를 수행합니다. Gradle JVM은 JDK 21로 지정하고, `app` 모듈의 `debug` 변형과 실행 기기를 선택한 뒤 Run 합니다. `debug` 실행에는 Metro가 필요합니다. SDK 경로는 Android Studio에서 확인하거나 로컬 `android/local.properties`에 설정하며 이 파일은 공유하지 않습니다.

터미널 빌드:

```sh
cd android
# Windows: gradlew.bat assembleDebug
./gradlew assembleDebug
```

## 주요 코드

| 경로 | 역할 |
|---|---|
| `src/navigation/RootNavigator.tsx` | 인증 상태에 따른 화면 전환 |
| `src/screens/auth/` | 로그인 화면과 카카오 OAuth WebView |
| `src/store/authStore.ts` | 로그인 토큰과 사용자 상태 |
| `src/api/client.ts` | 인증 헤더와 공통 API 응답 처리 |
| `src/api/endpoints/` | 인증·매장 API |
| `src/api/queries/` | TanStack Query 조회·변경 hook |
| `src/screens/map/MapScreen.tsx` | 지도·메뉴 필터·매장 카드 |
| `src/components/map/` | 카카오 지도 WebView와 마커·카드 |

외부 로그인, 지도, 실제 매장 조회에는 해당 서비스 설정과 백엔드가 필요합니다. 미설정 상태에서는 기존 설정 안내 또는 연결 오류가 표시됩니다.
