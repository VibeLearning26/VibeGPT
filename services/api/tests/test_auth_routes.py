import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from jose import jwt

from app.api.v1.endpoints import admin as admin_endpoints
from app.api.v1.endpoints import auth as auth_endpoints
from app.core.config import get_settings
from app.core.security import create_access_token, hash_password
from app.database.session import get_db
from app.models.user import User, UserRole


class ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value

    def scalars(self):
        return self

    def all(self):
        return self.value


def make_user(role: UserRole = UserRole.SUPER_ADMIN) -> User:
    now = datetime.now(UTC)
    return User(
        id=uuid.uuid4(),
        email="admin@vibegpt.local" if role != UserRole.STUDENT else "student@vibegpt.local",
        hashed_password=hash_password("ValidPassword123"),
        full_name="Test User",
        role=role,
        is_active=True,
        archived_at=None,
        created_at=now,
        updated_at=now,
    )


async def request_with_db(db, method: str, path: str, **kwargs):
    app = FastAPI()
    # Some development configurations rate-limit login; production behavior is
    # tested the same way whether that optional decorator is present or absent.
    if hasattr(auth_endpoints, "limiter"):
        app.state.limiter = auth_endpoints.limiter
    app.include_router(auth_endpoints.router, prefix="/api/v1")
    app.include_router(admin_endpoints.router, prefix="/api/v1")

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        return await client.request(method, path, **kwargs)


@pytest.mark.asyncio
async def test_valid_admin_login_returns_real_access_jwt_and_role():
    admin = make_user()
    db = AsyncMock()
    db.execute.return_value = ScalarResult(admin)
    db.add = Mock()

    response = await request_with_db(
        db,
        "POST",
        "/api/v1/auth/login",
        json={"email": admin.email, "password": "ValidPassword123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "super_admin"
    assert body["access_token"].count(".") == 2
    assert not body["access_token"].startswith("demo-token-")


@pytest.mark.asyncio
async def test_login_rejects_wrong_password():
    db = AsyncMock()
    db.execute.return_value = ScalarResult(make_user())

    response = await request_with_db(
        db,
        "POST",
        "/api/v1/auth/login",
        json={"email": "admin@vibegpt.local", "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


@pytest.mark.asyncio
async def test_login_rejects_nonexistent_user():
    db = AsyncMock()
    db.execute.return_value = ScalarResult(None)

    response = await request_with_db(
        db,
        "POST",
        "/api/v1/auth/login",
        json={"email": "missing@vibegpt.local", "password": "anything"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


@pytest.mark.asyncio
async def test_valid_admin_jwt_accesses_semesters_and_subjects():
    admin = make_user()
    db = AsyncMock()
    db.execute.side_effect = [
        ScalarResult(admin),
        ScalarResult([]),
        ScalarResult(admin),
        ScalarResult([]),
    ]
    token = create_access_token(str(admin.id), admin.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    semesters = await request_with_db(db, "GET", "/api/v1/admin/semesters", headers=headers)
    subjects = await request_with_db(db, "GET", "/api/v1/admin/subjects", headers=headers)

    assert semesters.status_code == 200
    assert semesters.json() == []
    assert subjects.status_code == 200
    assert subjects.json() == []


def expired_access_token(user: User) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": str(user.id),
            "role": user.role.value,
            "type": "access",
            "iat": now - timedelta(hours=2),
            "exp": now - timedelta(hours=1),
            "jti": str(uuid.uuid4()),
        },
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


@pytest.mark.asyncio
@pytest.mark.parametrize("token", ["demo-token-admin", "expired"])
async def test_invalid_or_expired_tokens_are_rejected(token):
    admin = make_user()
    if token == "expired":
        token = expired_access_token(admin)
    db = AsyncMock()

    response = await request_with_db(
        db,
        "GET",
        "/api/v1/admin/semesters",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired token"
    db.execute.assert_not_awaited()


@pytest.mark.asyncio
async def test_student_jwt_is_denied_from_admin_routes():
    student = make_user(UserRole.STUDENT)
    db = AsyncMock()
    db.execute.return_value = ScalarResult(student)
    token = create_access_token(str(student.id), student.role.value)

    response = await request_with_db(
        db,
        "GET",
        "/api/v1/admin/subjects",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert "requires one of these roles" in response.json()["detail"]
