"""
VibeGPT API – Core Configuration

Loads and validates all environment variables at startup.
Uses pydantic-settings for type-safe configuration.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────
    APP_ENV: Literal["development", "staging", "production"] = "development"
    APP_NAME: str = "VibeGPT"
    DOMAIN: str = "localhost"
    WEB_URL: str = "http://localhost:3000"
    API_URL: str = "http://localhost:8000"

    # ── Database ─────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://vibegpt:vibegpt_dev_password@localhost:5432/vibegpt"
    POSTGRES_DB: str = "vibegpt"
    POSTGRES_USER: str = "vibegpt"
    POSTGRES_PASSWORD: str = "vibegpt_dev_password"

    # ── Authentication ───────────────────────────────────────
    JWT_SECRET_KEY: str = "change-this-to-a-random-64-char-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_MINUTES: int = 30
    JWT_REFRESH_TOKEN_DAYS: int = 7

    # ── AI / LLM ────────────────────────────────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2:3b"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # ── File Storage ─────────────────────────────────────────
    UPLOAD_DIRECTORY: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # ── CORS ─────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8000"

    # ── Initial Admin ────────────────────────────────────────
    INITIAL_ADMIN_EMAIL: str = "admin@vibegpt.local"
    INITIAL_ADMIN_PASSWORD: str = "change-this-admin-password"

    # ── Worker ───────────────────────────────────────────────
    WORKER_POLL_INTERVAL_SECONDS: int = 10
    WORKER_MAX_RETRIES: int = 3

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def upload_path(self) -> Path:
        path = Path(self.UPLOAD_DIRECTORY)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if v == "change-this-to-a-random-64-char-string":
            import warnings
            warnings.warn(
                "JWT_SECRET_KEY is set to the default value. "
                "Change it to a secure random string in production!",
                stacklevel=2,
            )
        return v


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
