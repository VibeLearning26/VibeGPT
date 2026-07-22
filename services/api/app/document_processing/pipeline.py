"""
VibeGPT – Document Processing Pipeline

extract text → chunk → embed → persist DocumentChunk rows → mark READY.
Runs as a FastAPI background task after upload.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select

from app.database.session import async_session_factory
from app.document_processing.extraction import ExtractionError, TextUnit, extract_text
from app.models.document import (
    Document,
    DocumentChunk,
    DocumentProcessingJob,
    DocumentStatus,
    ProcessingJobStatus,
)
from app.rag.embedding import EmbeddingError, EmbeddingService

logger = logging.getLogger(__name__)

# Chunking parameters (word-based; ~1.3 tokens per word for English text)
CHUNK_WORDS = 220
CHUNK_OVERLAP_WORDS = 40


def chunk_units(units: list[TextUnit]) -> list[tuple[str, TextUnit]]:
    """Split text units into overlapping word-window chunks.

    Returns (chunk_text, source_unit) pairs so each chunk keeps its location.
    """
    chunks: list[tuple[str, TextUnit]] = []
    for unit in units:
        words = unit.text.split()
        if not words:
            continue
        if len(words) <= CHUNK_WORDS:
            chunks.append((unit.text.strip(), unit))
            continue
        start = 0
        while start < len(words):
            window = words[start : start + CHUNK_WORDS]
            chunks.append((" ".join(window), unit))
            if start + CHUNK_WORDS >= len(words):
                break
            start += CHUNK_WORDS - CHUNK_OVERLAP_WORDS
    return chunks


async def process_document(document_id: uuid.UUID, job_id: uuid.UUID) -> None:
    """Full processing pipeline for one uploaded document.

    Opens its own DB session because it runs as a background task after
    the request's session is closed.
    """
    async with async_session_factory() as db:
        doc = (
            await db.execute(select(Document).where(Document.id == document_id))
        ).scalar_one_or_none()
        job = (
            await db.execute(
                select(DocumentProcessingJob).where(DocumentProcessingJob.id == job_id)
            )
        ).scalar_one_or_none()
        if doc is None or job is None:
            logger.error(f"process_document: document or job not found ({document_id})")
            return

        job.status = ProcessingJobStatus.RUNNING
        job.started_at = datetime.now(UTC)
        await db.commit()

        try:
            # 1. Extract text (sync, CPU/IO bound → thread)
            units = await asyncio.to_thread(extract_text, Path(doc.storage_path))

            # 2. Chunk
            pairs = chunk_units(units)
            if not pairs:
                raise ExtractionError("Document produced no text chunks")

            # 3. Embed in batch (sync model inference → thread)
            texts = [text for text, _ in pairs]
            service = EmbeddingService()
            embeddings = await asyncio.to_thread(service.embed_batch, texts)

            # 4. Persist chunks
            for idx, ((text, unit), embedding) in enumerate(
                zip(pairs, embeddings, strict=True)
            ):
                db.add(
                    DocumentChunk(
                        document_id=doc.id,
                        content=text,
                        page_number=unit.page_number,
                        slide_number=unit.slide_number,
                        sheet_name=unit.sheet_name,
                        heading=unit.heading,
                        chunk_index=idx,
                        token_count=int(len(text.split()) * 1.3),
                        embedding=embedding,
                        is_active=True,
                    )
                )

            doc.total_chunks = len(pairs)
            doc.status = DocumentStatus.READY
            doc.processing_error = None
            job.status = ProcessingJobStatus.COMPLETED
            job.completed_at = datetime.now(UTC)
            job.chunks_created = len(pairs)
            await db.commit()
            logger.info(
                f"Processed document {doc.document_name}: {len(pairs)} chunks embedded"
            )

        except (ExtractionError, EmbeddingError) as e:
            await db.rollback()
            doc.status = DocumentStatus.FAILED
            doc.processing_error = str(e)
            job.status = ProcessingJobStatus.FAILED
            job.completed_at = datetime.now(UTC)
            job.error_message = str(e)
            await db.commit()
            logger.error(f"Document processing failed for {document_id}: {e}")
        except Exception as e:  # unexpected — keep the job record honest
            await db.rollback()
            doc.status = DocumentStatus.FAILED
            doc.processing_error = f"Unexpected error: {e}"
            job.status = ProcessingJobStatus.FAILED
            job.completed_at = datetime.now(UTC)
            job.error_message = str(e)
            await db.commit()
            logger.exception(f"Unexpected processing error for {document_id}")
