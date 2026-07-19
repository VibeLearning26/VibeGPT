"""
VibeGPT – Campus Study Agent API

FastAPI application entry point.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import all models so they are registered with SQLAlchemy
import app.models  # noqa: F401
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.database.init_db import init_db
from app.database.session import async_session_factory

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    settings = get_settings()
    logger.info(f"Starting {settings.APP_NAME} ({settings.APP_ENV})")

    # Initialize database with defaults
    async with async_session_factory() as session:
        try:
            await init_db(session)
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            logger.info("Make sure PostgreSQL is running and migrations have been applied.")

    yield

    logger.info("Shutting down VibeGPT API")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="VibeGPT – Campus Study Agent API",
        description=(
            "RAG-powered academic answer generation system. "
            "Students ask questions, receive exam-ready answers grounded in "
            "admin-approved college study materials."
        ),
        version="0.1.0",
        docs_url="/api/docs" if not settings.is_production else None,
        redoc_url="/api/redoc" if not settings.is_production else None,
        openapi_url="/api/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API routes
    app.include_router(api_router)

    return app


app = create_app()
