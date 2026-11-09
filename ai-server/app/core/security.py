import hmac

from fastapi import Header, HTTPException

from app.core.config import settings


def verify_internal_token(x_internal_token: str = Header(default="")):
    """Express와 공유한 토큰 확인. /health 를 제외한 모든 라우터에 적용."""
    if not settings.internal_api_token or not isinstance(x_internal_token, str) or not hmac.compare_digest(
        x_internal_token.encode('utf-8'), settings.internal_api_token.encode('utf-8')
    ):
        raise HTTPException(status_code=401, detail="unauthorized")
