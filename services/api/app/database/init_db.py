"""
VibeGPT API – Database Initialization

Creates initial admin user and default answer rules on first startup.
"""

from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.academic import Semester
from app.models.answer_rule import AnswerRule
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


async def create_default_semesters(db: AsyncSession) -> None:
    """Ensure the standard S1 through S8 semesters exist and are selectable."""
    result = await db.execute(select(Semester))
    existing = {semester.number: semester for semester in result.scalars().all()}
    created: list[str] = []

    for number in range(1, 9):
        semester = existing.get(number)
        if semester is not None:
            # A previously archived standard semester must remain selectable.
            semester.is_active = True
            semester.archived_at = None
            continue

        name = f"S{number}"
        db.add(Semester(number=number, name=name, is_active=True))
        created.append(name)

    await db.flush()
    if created:
        logger.info("Created default semesters: %s", ", ".join(created))
    else:
        logger.info("Default semesters S1-S8 already exist")


async def create_initial_admin(db: AsyncSession) -> None:
    """Create the initial admin user if no admin exists."""
    settings = get_settings()

    result = await db.execute(
        select(User).where(User.role.in_([UserRole.SUPER_ADMIN, UserRole.ADMIN]))
    )
    if result.scalar_one_or_none() is not None:
        logger.info("Admin user already exists, skipping creation")
        return

    admin = User(
        email=settings.INITIAL_ADMIN_EMAIL,
        hashed_password=hash_password(settings.INITIAL_ADMIN_PASSWORD),
        full_name="System Administrator",
        role=UserRole.SUPER_ADMIN,
        is_active=True,
    )
    db.add(admin)
    await db.flush()
    logger.info(f"Created initial admin: {settings.INITIAL_ADMIN_EMAIL}")


async def create_default_answer_rules(db: AsyncSession) -> None:
    """Create default 2, 5, and 10-mark answer rules if none exist."""
    result = await db.execute(select(AnswerRule).where(AnswerRule.is_default))
    if result.scalars().first() is not None:
        logger.info("Default answer rules already exist, skipping")
        return

    defaults = [
        AnswerRule(
            marks=2,
            name="2-Mark Quick Answer",
            description="Direct definition or formula with minimal explanation",
            min_words=35,
            max_words=60,
            required_sections=["definition"],
            num_points=2,
            use_bullet_points=False,
            use_paragraphs=True,
            require_formula=False,
            require_example=False,
            require_conclusion=False,
            require_citations=True,
            preferred_style="concise",
            is_default=True,
            is_active=True,
        ),
        AnswerRule(
            marks=5,
            name="5-Mark Standard Answer",
            description="Definition, explanation, key points with formula/example",
            min_words=120,
            max_words=180,
            required_sections=["introduction", "explanation", "key_points"],
            num_points=4,
            use_bullet_points=True,
            use_paragraphs=True,
            require_formula=False,
            require_example=False,
            require_conclusion=False,
            require_citations=True,
            preferred_style="academic",
            is_default=True,
            is_active=True,
        ),
        AnswerRule(
            marks=10,
            name="10-Mark Detailed Answer",
            description="Comprehensive answer with intro, explanation, points, example, conclusion",
            min_words=250,
            max_words=350,
            required_sections=["introduction", "explanation", "key_points", "conclusion"],
            num_points=6,
            use_bullet_points=True,
            use_paragraphs=True,
            require_formula=False,
            require_example=True,
            require_conclusion=True,
            require_citations=True,
            preferred_style="detailed_academic",
            is_default=True,
            is_active=True,
        ),
    ]

    for rule in defaults:
        db.add(rule)

    await db.flush()
    logger.info("Created default answer rules for 2, 5, and 10 marks")


async def create_demo_data(db: AsyncSession) -> None:
    """Create demo student account for testing."""
    settings = get_settings()

    # Only create demo data in development
    if settings.APP_ENV != "development":
        return

    result = await db.execute(select(User).where(User.email == "student@vibegpt.local"))
    if result.scalar_one_or_none() is not None:
        return

    student = User(
        email="student@vibegpt.local",
        hashed_password=hash_password("student123"),
        full_name="Demo Student",
        role=UserRole.STUDENT,
        is_active=True,
    )
    db.add(student)
    await db.flush()
    logger.info("Created demo student: student@vibegpt.local / student123")


async def init_db(db: AsyncSession) -> None:
    """Run all initialization tasks."""
    await create_default_semesters(db)
    await create_initial_admin(db)
    await create_default_answer_rules(db)
    await create_demo_data(db)
    await db.commit()
