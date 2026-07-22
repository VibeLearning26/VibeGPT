"""Add embedding column to document_chunks

Revision ID: 30967e1d5b0e
Revises: 78af08a344ac
Create Date: 2026-07-16 06:16:24.855014
"""

from collections.abc import Sequence

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "30967e1d5b0e"
down_revision: str | None = "78af08a344ac"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("document_chunks")}
    if "embedding" not in columns:
        op.add_column(
            "document_chunks",
            sa.Column("embedding", Vector(384), nullable=True),
        )


def downgrade() -> None:
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("document_chunks")}
    if "embedding" in columns:
        op.drop_column("document_chunks", "embedding")
