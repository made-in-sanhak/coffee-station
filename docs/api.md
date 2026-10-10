# 앱 ↔ Spring API 명세

공통 응답 형식
```json
{ "success": true, "data": { }, "message": null }
```

| 기능 | Method | URL | 설명 | 담당 |
| --- | --- | --- | --- | --- |
| 상태 확인 | GET | /health | 서버 동작 확인 | - |
