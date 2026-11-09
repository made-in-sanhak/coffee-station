"""Noninteractive notebook configuration. Never print or return missing values."""
import os
from pathlib import Path


def read_gemini_settings(ai_root: Path) -> tuple[str, str]:
    from dotenv import dotenv_values

    # Environment overrides ai-server/.env, which overrides repository .env.
    values = {
        **dotenv_values(ai_root.parent / ".env", interpolate=False),
        **dotenv_values(ai_root / ".env", interpolate=False),
        **{name: os.environ[name] for name in ("GEMINI_API_KEY", "GEMINI_MODEL")
           if name in os.environ},
    }
    names = ("GEMINI_API_KEY", "GEMINI_MODEL")
    missing = [name for name in names if not (values.get(name) or "").strip()]
    if missing:
        raise ValueError(
            "Gemini 설정 누락: " + ", ".join(missing)
            + ". 저장소 루트 또는 ai-server/.env에 입력한 뒤 설정 셀을 다시 실행하세요."
        )
    return tuple(values[name].strip() for name in names)
