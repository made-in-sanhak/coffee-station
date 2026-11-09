from fastapi import FastAPI

from app.routers import health, recommendations, review_summaries

app = FastAPI(title="Coffee Station AI Server")

app.include_router(health.router)
app.include_router(recommendations.router)
app.include_router(review_summaries.router)
# 새 라우터는 여기에 추가: app.include_router(receipt.router)
