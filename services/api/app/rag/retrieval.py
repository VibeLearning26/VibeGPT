"""
VibeGPT - Document Retrieval Service
"""

import logging
from typing import List, Optional
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import DocumentChunk, Document, DocumentStatus
from app.rag.embedding import EmbeddingService

logger = logging.getLogger(__name__)

class RetrievalService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.embedding_service = EmbeddingService()

    async def search_chunks(
        self,
        query: str,
        subject_id: uuid.UUID,
        module_id: Optional[uuid.UUID] = None,
        top_k: int = 5,
        threshold: float = 0.5
    ) -> List[DocumentChunk]:
        """
        Search for document chunks using vector cosine distance.
        """
        try:
            # 1. Embed query
            query_vector = self.embedding_service.embed_query(query)
            
            # 2. Build base query with distance calculation
            distance_expr = DocumentChunk.embedding.cosine_distance(query_vector)
            
            stmt = (
                select(DocumentChunk)
                .join(Document)
                .where(
                    DocumentChunk.is_active == True,
                    Document.is_active == True,
                    Document.status == DocumentStatus.READY,
                    Document.subject_id == subject_id
                )
            )
            
            if module_id:
                stmt = stmt.where(Document.module_id == module_id)
                
            # Filter by cosine distance threshold
            # pgvector's cosine distance is 0 for identical vectors, up to 2 for opposite.
            # A threshold of 0.5 distance means similarity > 0.5
            stmt = stmt.where(distance_expr < threshold)
            
            # Order by distance ascending (closest first)
            stmt = stmt.order_by(distance_expr)
            stmt = stmt.limit(top_k)
            
            result = await self.db.execute(stmt)
            chunks = result.scalars().all()
            
            return list(chunks)
            
        except Exception as e:
            logger.error(f"Error during vector retrieval: {e}")
            raise
