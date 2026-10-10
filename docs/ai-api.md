# Spring ↔ AI 서버 API 명세

`/health` 를 제외한 모든 요청에는 `X-Internal-Token` 헤더가 필요합니다.

| 기능 | Method | URL | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| 상태 확인 | GET | /health | - | `{"status":"ok"}` |
