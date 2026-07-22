"""init and add vector extension

Revision ID: 78af08a344ac
Revises:
Create Date: 2026-07-19 02:33:35.234046
"""
from collections.abc import Sequence

import pgvector.sqlalchemy
import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '78af08a344ac'
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    # Ensure pgvector extension exists
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    # Add embedding column to document_chunks
    op.add_column('document_chunks', sa.Column('embedding', pgvector.sqlalchemy.Vector(384), nullable=True))


def downgrade() -> None:
    op.drop_column('document_chunks', 'embedding')
