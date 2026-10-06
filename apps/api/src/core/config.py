"""Application settings, loaded from environment / .env.

Owner: Assad (backend). Every other module reads configuration from here –
never from os.environ directly – so that tests can override it in one place.
"""
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: Literal["development", "production"] = "development"
    dev_auth: bool = True
    cors_origins: str = "http://localhost:8085"

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    supabase_bucket: str = "skin-images"

    # AI provider for analysis + chat
    ai_provider: Literal["mock", "gemini", "anthropic"] = "mock"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    anthropic_api_key: str = ""
    ai_model: str = "claude-opus-5-5"
    ai_effort: Literal["low", "medium", "high", "xhigh", "max"] = "medium"

    # Face detection (photo quality) – opencv runs locally, google calls Cloud Vision
    face_detector: Literal["opencv", "google"] = "opencv"
    google_vision_api_key: str = ""

    # Image rules
    max_image_bytes: int = 8 * 1024 * 1024
    min_image_side: int = 480

    @property
    def supabase_enabled(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.is_production and settings.dev_auth:
        raise RuntimeError("DEV_AUTH must be false in production")
    if settings.face_detector == "google" and not settings.google_vision_api_key:
        raise RuntimeError("FACE_DETECTOR=google kräver GOOGLE_VISION_API_KEY")
    return settings
