# 행신 지도 DB 로컬 검증 — 진행 기록

2026-11-11, `codex/mvp-frontend-integration`, HEAD `fd82b28`.
기존 미커밋 변경을 보존했으며 Git 작업이나 DB 쓰기는 하지 않았다.

## DB와 PC API: 실제 검증 완료

Docker coffee-mysql의 기존 자료를 사용했다. 공식 schema.sql의 컬럼 존재·타입·NULL 조건을
SHOW FULL COLUMNS와 대조하고 실제 SHOW CREATE TABLE을 결과 JSON에 보관했다.
기존 데이터가 있으므로 schema/seed를 재적재하지 않았고 ID 배정·갱신·볼륨 초기화도 없었다.

- brands 8, cafes 8, menus 2, menu_prices 55.
- 지도 API 대상 DEMO/ON_SALE 옵션: 행신 중심 1km 내 8매장, 51옵션.
- 나머지 4옵션은 DEMO 대상이 아니므로 이번 조회에서 제외된다.
- 원문 메뉴/온도/사이즈 조합 31개를 실제 DB와 HTTP API로 대조했다.
- cafe.id, price_id 기반 menus.id, 옵션 가격, 최저가, verified=false, 확인일 미노출이 일치했다.
- 아메리카노/ICE/기본: 5매장, 컴포즈 고양행신점 cafe 9004 / price 9028 / 1800원.
- 카페라떼/ICE/기본: 5매장, 메가 행신역점 cafe 9003 / price 9025 / 2900원.
- sort=rating → 실제 HTTP 422. 미등록 사이즈 → 실제 HTTP 200 / 빈 배열.
- DB 장애 → HTTP 503 / 오류 비공개 / mock 비대체는 주입 HTTP 테스트로 확인했다.

서버 실행: NODE_ENV=development, EXTRACTION_MODE=mock,
MVP_CATALOG_MODE=mysql-seed, HOST=0.0.0.0, PORT=8080.
실제 Gemini/Python 실행·외부 배포는 하지 않았다.

재현: backend에서 `npm run build`, `node scripts/verify-map-db.cjs --api`.
결과: `backend/artifacts/map-db-verification.json` (비밀 접속값 없음).

## 수정과 문서 대비 차이

- MainApplication.kt: useDevSupport=false로 고정돼 Debug에서도 이전 내장 번들을 실행했다.
  BuildConfig.DEBUG로 수정해 Debug는 Metro, Release는 내장 번들을 사용하게 했다.
- modules/cafes/router.ts: `/api/cafes/options`에 DB 원문 사이즈 조회 추가.
  기존 지도 API의 mock/production 차단은 유지했다.
- MapScreen.tsx: 사이즈를 기본/Regular로 추정 변환하지 않고 원문 선택·전달한다.
  HOT/ICE 선택, 지원 메뉴 2종, 지원 정렬 2종, 시연 가격 표시를 제공한다.
- exploreLogic.ts: 기본=Regular 별칭을 제거했다. 이름/근접 좌표만으로 카카오와 DB를
  병합하지 않으며, 명시적 placeUrl 근거 또는 기존 DB ID를 사용한다.
  서로 다른 출처의 동일 숫자 ID가 충돌하면 카카오 화면 ID에 출처 접두어를 부여한다.
  이는 DB ID나 카카오 실제 ID를 새로 생성한 매핑이 아니다.
- 기존 미커밋 routes/cafes.ts의 상세·전체 메뉴 API는 이번 검증 범위 밖이다.
  `/api/cafes` 목록은 modules/cafes/router.ts가 먼저 처리한다.

## 회귀 검증

- backend npm test: 빌드 및 33개 테스트 통과 (기존 32 + DB 장애 HTTP 1).
- frontend 타입 검사 통과.
- 지도 관련 Jest 4 suites / 32 tests 통과.
- Android Debug 빌드 및 Pixel_8 에뮬레이터 설치·실행 성공.

## 기기 화면: 진행 중

첫 Medium_Phone AVD는 offline 상태여서 설치 실패. 이번 실행 프로세스만 종료하고
기존 Pixel_8 AVD를 스냅샷 복원 없이 소프트웨어 GPU로 부팅했다. 앱 데이터 삭제는 없었다.
현재 Debug 앱은 Metro에서 최신 번들을 다운로드한다.
사용자가 카카오 로그인을 직접 수행한다. 로그인 후 다음을 별도로 확인해야 한다.

- 에뮬레이터 → 10.0.2.2:8080 실제 HTTP 연결.
- 카카오 지도 로딩 (개발 키로 지도/행신 검색 사용 승인받음).
- 지도 중심 행신 이동, DB 마커·카드 표시.
- 카드 매장 ID·옵션·가격과 API의 대응 및 원문 사이즈별 변경.
- 비밀값 없는 최종 지도 캡처.

현재 PC API 성공을 지도 표시 성공으로 간주하지 않는다.
