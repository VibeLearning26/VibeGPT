"""
VibeGPT API – V1 Router

Aggregates all v1 endpoint routers.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, student, admin, system

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(student.router)
api_router.include_router(admin.router)
api_router.include_router(system.router)
