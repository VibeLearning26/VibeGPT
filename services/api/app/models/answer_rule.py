"""
VibeGPT – Answer Rule and Example Models

Tables: answer_rules, answer_examples
"""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.academic import Subject


class AnswerRule(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "answer_rules"

    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True, index=True
    )
    marks: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # JSON configuration for the answer rule
    min_words: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    max_words: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    required_sections: Mapped[list | None] = mapped_column(JSON, nullable=True)
    num_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    use_bullet_points: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    use_paragraphs: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    require_formula: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    require_example: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    require_conclusion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    require_citations: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    preferred_style: Mapped[str | None] = mapped_column(String(100), nullable=True)
    allow_regeneration: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    full_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    subject: Mapped[Subject | None] = relationship(back_populates="answer_rules")

    def __repr__(self) -> str:
        return f"<AnswerRule {self.marks}marks: {self.name}>"

    def to_prompt_json(self) -> dict:
        """Convert rule to JSON for prompt injection."""
        return {
            "marks": self.marks,
            "min_words": self.min_words,
            "max_words": self.max_words,
            "required_sections": self.required_sections or [],
            "num_points": self.num_points,
            "use_bullet_points": self.use_bullet_points,
            "require_formula": self.require_formula,
            "require_example": self.require_example,
            "require_conclusion": self.require_conclusion,
            "require_citations": self.require_citations,
            "preferred_style": self.preferred_style,
        }


class AnswerExample(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "answer_examples"

    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False, index=True
    )
    module_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("modules.id"), nullable=True
    )
    marks: Mapped[int] = mapped_column(Integer, nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<AnswerExample {self.marks}marks: {self.question[:50]}>"
