# 앱 ↔ Express API 안내

현재 구현된 AI 경로와 요청·응답은 [실시간 추천](ai-recommendation.md)을 따른다. 공통 성공 응답은 `{"success":true,"data":{},"message":null}`이다. `/health`는 서버·DB 상태를 보고한다.

인증, 카페·메뉴, 구매, OCR 등 전체 제품 API 명세는 팀 계약 확정 후 추가한다. 구현되지 않은 경로를 현재 API로 표시하지 않는다.
