from fastapi import Header, HTTPException

from app.core.config import settings


def verify_internal_token(x_internal_token: str = Header(default="")):
    """Spring 서버에서 온 요청인지 헤더 토큰으로 확인. /health 를 제외한 모든 라우터에 적용."""
    if not settings.internal_api_token or x_internal_token != settings.internal_api_token:
        raise HTTPException(status_code=401, detail="unauthorized")
