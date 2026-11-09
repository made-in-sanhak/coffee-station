# 모의 리뷰 요약 화면

App.tsx의 기본 샘플 화면을 ReviewSummaryScreen으로 연결했다.
첫 실행은 로컬 임시 리뷰 3개이며 네트워크/실제 DB/Gemini를 사용하지 않는다.
모의 서버 조회 버튼은 기존 apiFetch를 통해 /api/cafes/990001/review-summary를 호출한다.
data_mode가 mock이 아니면 표시하지 않는다. 로딩·빈 리뷰·오류·재조회·캐시 재사용을 표시한다.
12초 요청 제한, 화면 전환/종료 시 요청 취소와 오래된 응답 무시를 적용했다.
내부 API 토큰은 앱으로 전달하지 않는다.

실행: frontend에서 npm start, 별도 터미널에서 npm run android.
로컬 보기에는 서버가 필요 없다. 서버 조회에는 Express/Python 서버가 필요하다.
기존 API 주소는 Android 에뮬레이터용 http://10.0.2.2:8080이다.
에뮬레이터에서 접근하려면 PC의 Express가 접근 가능한 인터페이스에서 수신해야 한다.
iOS/실기기는 src/api/client.ts의 서버 주소를 해당 개발 환경에 맞춰야 한다.

검증: TypeScript, 변경 파일 ESLint, Jest 3개 통과.
실제 Android/iOS 기기 실행 및 시각 검증은 아직 하지 않았다.
전체 추천 입력/조건 확인 화면과 로그인 연결은 다음 단계다.

현재 사용자 지시: 실제 데이터 사용은 명시적 요청 전까지 금지.
Git 관련 작업 역시 별도 지시 전까지 수행하지 않는다.
