"""
VibeGPT API – System Endpoints

GET /api/v1/health
GET /api/v1/ready
GET /api/v1/version
"""

from __future__ import annotations

import httpx
from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import get_settings
from app.core.dependencies import DbSession
from app.schemas.common import HealthResponse, ReadyResponse

router = APIRouter(tags=["System"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Basic health check — returns OK if the API is running."""
    return HealthResponse()


@router.get("/ready", response_model=ReadyResponse)
async def readiness_check(db: DbSession):
    """Readiness check — verifies database and Ollama connectivity."""
    settings = get_settings()

    # Check database
    db_ok = False
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    # Check Ollama
    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            ollama_ok = resp.status_code == 200
    except Exception:
        pass

    status = "ready" if db_ok else "degraded"
    return ReadyResponse(status=status, database=db_ok, ollama=ollama_ok)


@router.get("/version")
async def version():
    """Return the API version and environment."""
    settings = get_settings()
    return {
        "name": settings.APP_NAME,
        "version": "0.1.0",
        "environment": settings.APP_ENV,
    }
