"""
VibeGPT API – Retrieval Service

Performs semantic vector search on DocumentChunks using sentence-transformers
and the pgvector extension on PostgreSQL.
"""

from __future__ import annotations

import uuid
from typing import Any
from sentence_transformers import SentenceTransformer
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.document import Document, DocumentChunk, DocumentStatus


class RetrievalService:
    """Service to handle embedding generation and vector search retrieval."""

    def __init__(self, model_name: str | None = None):
        """
        Initialize the retrieval service.

        Args:
            model_name: Name of the sentence-transformers model. Defaults to settings.EMBEDDING_MODEL.
        """
        settings = get_settings()
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self._model: SentenceTransformer | None = None

    @property
    def model(self) -> SentenceTransformer:
        """Lazy load the sentence transformer model."""
        if self._model is None:
            self._model = SentenceTransformer(self.model_name)
        return self._model

    async def retrieve(
        self,
        db: AsyncSession,
        question: str,
        subject_id: uuid.UUID,
        module_id: uuid.UUID | None = None,
        limit: int = 5,
        relevance_threshold: float = 0.35,
    ) -> list[tuple[DocumentChunk, float]]:
        """
        Retrieve relevant DocumentChunks using semantic similarity search.

        Args:
            db: SQLAlchemy AsyncSession.
            question: The search query (student's question).
            subject_id: Target academic subject ID.
            module_id: Optional target module ID.
            limit: Maximum number of chunks to return. Defaults to 5.
            relevance_threshold: Minimum cosine similarity score required (1 - cosine_distance).

        Returns:
            A list of tuples containing (DocumentChunk, relevance_score).
        """
        # 1. Generate query embedding vector
        query_vector = self.model.encode(question).tolist()

        # 2. Select document chunk and calculate cosine distance
        distance_col = DocumentChunk.embedding.cosine_distance(query_vector).label("distance")
        stmt = (
            select(DocumentChunk, distance_col)
            .join(Document, DocumentChunk.document_id == Document.id)
            .where(
                and_(
                    Document.subject_id == subject_id,
                    Document.is_active == True,
                    Document.status == DocumentStatus.PUBLISHED,
                    DocumentChunk.is_active == True,
                )
            )
            .options(selectinload(DocumentChunk.document))
        )

        if module_id:
            stmt = stmt.where(Document.module_id == module_id)

        # Order by closest distance first (lowest distance = highest similarity)
        stmt = stmt.order_by("distance").limit(limit)

        result = await db.execute(stmt)
        rows = result.all()

        # 3. Filter results by relevance threshold and calculate score
        relevant_results = []
        for chunk, distance in rows:
            # Cosine similarity = 1.0 - cosine_distance
            relevance_score = 1.0 - float(distance) if distance is not None else 0.0
            if relevance_score >= relevance_threshold:
                relevant_results.append((chunk, relevance_score))

        return relevant_results
