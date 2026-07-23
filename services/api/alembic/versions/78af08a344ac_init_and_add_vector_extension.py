"""init and add vector extension

Revision ID: 78af08a344ac
Revises: ae5e54fd249e
Create Date: 2026-07-19 02:33:35.234046
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '78af08a344ac'
down_revision: str | None = 'ae5e54fd249e'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    # pgvector extension already created manually (asyncpg has bug on Windows)
    pass


def downgrade() -> None:
    pass
