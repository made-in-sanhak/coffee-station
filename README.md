# ☕ 커피 주유소

커피 탐색과 가격 비교부터 이용 기록까지 연결하는 모바일 플랫폼
(2026학년도 2학기 산학프로젝트 · 팀 메이드 인 산학)

## 폴더 구조
- `backend/` Spring Boot 서버
- `frontend/` React Native 앱
- `data/` 데이터 수집·AI 평가 스크립트
- `infra/` 로컬 개발 환경
- `docs/` 기획·설계 문서

## 로컬 실행
1. `.env.example`을 복사해 `.env`를 만들고 값을 채운다
2. `docker compose -f infra/docker-compose.yml up -d` 로 DB 실행
3. 백엔드: `cd backend && ./gradlew bootRun`
4. 프론트엔드: `cd frontend && npm install && npx expo start`
