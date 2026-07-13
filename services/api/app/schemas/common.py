"""
VibeGPT API – Common Response Schemas
"""

from __future__ import annotations

from typing import Any, Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standard API response wrapper."""
    success: bool = True
    data: T | None = None
    message: str | None = None


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated list response."""
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class ErrorResponse(BaseModel):
    """Standard error response."""
    success: bool = False
    detail: str
    error_code: str | None = None


class IDResponse(BaseModel):
    """Response containing just an ID."""
    id: UUID


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    service: str = "vibegpt-api"
    version: str = "0.1.0"


class ReadyResponse(BaseModel):
    """Readiness check response."""
    status: str = "ready"
    database: bool = True
    ollama: bool = False
