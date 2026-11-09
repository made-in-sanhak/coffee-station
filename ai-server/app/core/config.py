from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    openai_api_key: str = ""
    internal_api_token: str = ""   # Express 서버와 공유하는 비밀값
    agent_repository: str = "mock"
    agent_cafe_ids: str = "990001"
    recommendation_mode: Literal['direct', 'agent'] = 'direct'
    extraction_mode: Literal['gemini', 'mock'] = 'gemini'

    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")


settings = Settings()
