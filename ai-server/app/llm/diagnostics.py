"""Allowlisted diagnostics: never emit exception text, URLs, keys or request bodies."""
import re


def diagnose_model_error(error: Exception) -> tuple[dict, str]:
    code = getattr(error, "code", None)
    code = code if type(code) is int and 100 <= code <= 599 else None
    known = {
        400: ("INVALID_REQUEST", "요청 형식·SDK 호환성 또는 API 키 오류를 확인하세요."),
        401: ("UNAUTHENTICATED", "API 키가 올바른지 확인하세요."),
        403: ("PERMISSION_DENIED", "키 권한·프로젝트 제한·무료 티어 이용 가능 여부를 확인하세요."),
        404: ("MODEL_NOT_FOUND", "모델 ID 또는 해당 모델의 generateContent 지원 여부를 확인하세요."),
        429: ("RATE_LIMITED", "요청·토큰·일일 할당량 또는 해당 모델의 무료 티어 한도를 확인하세요."),
        500: ("PROVIDER_ERROR", "Gemini 서버 내부 오류입니다. 잠시 후 다시 시도하세요."),
        503: ("PROVIDER_UNAVAILABLE", "Gemini 서버가 일시적으로 혼잡합니다. 잠시 후 다시 시도하세요."),
        504: ("PROVIDER_TIMEOUT", "Gemini 서버 응답 시간이 초과되었습니다."),
    }
    category, hint = known.get(code, ("MODEL_ERROR", "모델 호출 실패입니다. SDK와 실행 환경을 확인하세요."))
    if code is None:
        names = {cls.__name__ for cls in type(error).__mro__}
        if names & {"TimeoutError", "TimeoutException", "ReadTimeout", "ConnectTimeout"}:
            category, hint = "TIMEOUT", "네트워크 또는 모델 응답 시간이 초과되었습니다."
        elif names & {"ConnectError", "ConnectionError", "ProxyError", "NetworkError"}:
            category, hint = "NETWORK_ERROR", "인터넷·DNS·프록시·방화벽 연결을 확인하세요."
        elif names & {"ValidationError", "TypeError", "ValueError", "ImportError", "ModuleNotFoundError", "AttributeError"}:
            category, hint = "LOCAL_SDK_ERROR", "로컬 SDK·요청 구성 또는 모델 응답 처리 오류입니다. 무료 티어 소진으로 단정할 수 없습니다."
    diagnostic = {"error_code": category, "http_status": code}
    details = getattr(error, "details", {})
    if isinstance(details, dict):
        body = details.get("error", details)
        entries = body.get("details", []) if isinstance(body, dict) else []
        for entry in entries if isinstance(entries, list) else []:
            if not isinstance(entry, dict):
                continue
            if entry.get("reason") in {"API_KEY_INVALID", "API_KEY_EXPIRED", "API_KEY_SERVICE_BLOCKED"}:
                diagnostic["reason"] = entry["reason"]
                hint = "API 키의 유효성·만료·API 사용 제한을 확인하세요."
            delay = entry.get("retryDelay")
            if isinstance(delay, str) and re.fullmatch(r"\d{1,6}(?:\.\d{1,9})?s", delay):
                diagnostic["retry_after_s"] = float(delay[:-1])
            violations = entry.get("violations", [])
            if isinstance(violations, list) and any(
                isinstance(v, dict) and str(v.get("quotaValue")) == "0" for v in violations
            ):
                diagnostic["quota_limit_zero"] = True
                hint = "해당 할당량 한도가 0입니다. 잠시 기다리는 것만으로 해결되지 않을 수 있으니 프로젝트·모델 이용 가능 여부를 확인하세요."
    label = f"HTTP {code} / {category}" if code else category
    return diagnostic, f"[{label}] {hint}"
