# AI 서버 (FastAPI)

Spring 백엔드에서만 호출하는 내부 서버입니다. 앱이 직접 호출하지 않습니다.

## 로컬 실행
```bash
cd ai-server
python -m venv .venv
source .venv/Scripts/activate    # Windows Git Bash
# source .venv/bin/activate      # Mac / Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- http://localhost:8000/health 에서 `{"status":"ok"}` 가 나오면 성공
- API 문서: http://localhost:8000/docs

## 새 기능 추가 순서
1. `app/schemas/기능.py` — 요청·응답 형식 (Pydantic)
2. `app/services/기능/` — 실제 처리 로직
3. `app/routers/기능.py` — 엔드포인트 (`dependencies=[Depends(verify_internal_token)]` 필수)
4. `app/main.py` 에 `include_router` 추가
5. `docs/ai-api.md` 에 명세 추가
