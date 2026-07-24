"""Reset the local development admin password.

This is intended only for a developer machine/container, not production.
"""

from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.core.security import hash_password
from app.database.session import async_session_factory
from app.models.user import User


async def main() -> None:
    async with async_session_factory() as session:
        result = await session.execute(
            select(User).where(User.email == "admin@vibegpt.local")
        )
        user = result.scalar_one()
        user.hashed_password = hash_password("admin123")
        user.is_active = True
        await session.commit()
        print("admin password reset")


if __name__ == "__main__":
    asyncio.run(main())
