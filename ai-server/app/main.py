from fastapi import FastAPI

from app.routers import health

app = FastAPI(title="Coffee Station AI Server")

app.include_router(health.router)
# 새 라우터는 여기에 추가: app.include_router(receipt.router)
