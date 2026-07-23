"""Create the initial VibeGPT schema and pgvector extension.

Revision ID: 78af08a344ac
Revises: ae5e54fd249e
Create Date: 2026-07-19 02:33:35.234046
"""
from collections.abc import Sequence

import app.models  # noqa: F401
from alembic import op
from app.database.base import Base

# revision identifiers, used by Alembic.
revision: str = "78af08a344ac"
down_revision: str | None = "ae5e54fd249e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    # The repository did not contain the table-creation revision this migration
    # originally assumed. create_all is check-first and safely creates the full
    # current schema on a fresh database without dropping existing tables.
    Base.metadata.create_all(bind=op.get_bind(), checkfirst=True)


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind(), checkfirst=True)