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
from app.models.academic import Department, Semester
from app.models.answer_rule import AnswerRule
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

DEFAULT_DEPARTMENTS = [
    ("CSE", "Computer Science and Engineering"),
    ("AIML", "Artificial Intelligence and Machine Learning"),
    ("ECE", "Electronics and Communication Engineering"),
    ("EEE", "Electrical and Electronics Engineering"),
    ("ME", "Mechanical Engineering"),
    ("CE", "Civil Engineering"),
    ("IT", "Information Technology"),
    ("AE", "Automobile Engineering"),
    ("SH", "Science and Humanities"),
]


async def create_academic_catalog(db: AsyncSession) -> None:
    """Ensure the department and semester selectors have their base catalog."""
    existing_departments = set(
        (await db.execute(select(Department.code))).scalars().all()
    )
    for code, name in DEFAULT_DEPARTMENTS:
        if code not in existing_departments:
            db.add(Department(code=code, name=name, is_active=True))

    existing_semesters = set(
        (await db.execute(select(Semester.number))).scalars().all()
    )
    for number in range(1, 9):
        if number not in existing_semesters:
            db.add(Semester(number=number, name=f"Semester {number}", is_active=True))

    await db.flush()


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
    """Create any missing default answer rules for supported mark values."""
    result = await db.execute(select(AnswerRule).where(AnswerRule.is_default))
    existing_marks = {rule.marks for rule in result.scalars().all()}

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
            marks=3,
            name="3-Mark Short Answer",
            description="Brief definition with three focused explanatory points",
            min_words=60,
            max_words=100,
            required_sections=["definition", "key_points"],
            num_points=3,
            use_bullet_points=True,
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
            marks=8,
            name="8-Mark Extended Answer",
            description="Detailed explanation with key points, example, and conclusion",
            min_words=200,
            max_words=280,
            required_sections=["introduction", "explanation", "key_points", "conclusion"],
            num_points=5,
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
        if rule.marks not in existing_marks:
            db.add(rule)

    await db.flush()
    logger.info("Ensured default answer rules for 2, 3, 5, 8, and 10 marks")


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
    await create_academic_catalog(db)
    await create_initial_admin(db)
    await create_default_answer_rules(db)
    await create_demo_data(db)
    await db.commit()
