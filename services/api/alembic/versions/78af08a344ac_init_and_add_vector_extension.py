"""init and add vector extension

Revision ID: 78af08a344ac
Revises: 
Create Date: 2026-07-19 02:33:35.234046
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '78af08a344ac'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


import pgvector.sqlalchemy

def upgrade() -> None:
    # Ensure pgvector extension exists
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    # Add embedding column to document_chunks
    op.add_column('document_chunks', sa.Column('embedding', pgvector.sqlalchemy.Vector(384), nullable=True))


def downgrade() -> None:
    op.drop_column('document_chunks', 'embedding')
