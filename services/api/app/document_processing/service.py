"""
VibeGPT – Document Processing Service

Orchestrates parsing, chunking, and embedding handoff.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import List, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.document_processing.parsers import ParsedElement, parse_document
from app.document_processing.chunker import DocumentChunk, chunk_elements
from app.models.document import Document, DocumentChunk as DocumentChunkModel, DocumentProcessingJob, DocumentStatus, ProcessingJobStatus
from app.core.config import get_settings


class DocumentProcessingService:
    """Service for processing uploaded documents."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()
    
    async def process_document(self, job: DocumentProcessingJob) -> None:
        """
        Main processing pipeline:
        1. Mark job RUNNING, document PROCESSING
        2. Read file from storage
        3. Parse document into elements
        4. Chunk elements
        5. Store chunks in database
        6. Update document total_chunks and status READY
        7. Mark job COMPLETED
        
        On failure: mark job FAILED, document FAILED, record error.
        """
        doc = await self._get_document(job.document_id)
        if not doc:
            raise ValueError(f"Document {job.document_id} not found")
        
        # Update status to PROCESSING
        await self._update_job_status(job.id, ProcessingJobStatus.RUNNING, started=True)
        await self._update_doc_status(doc.id, DocumentStatus.PROCESSING)
        
        try:
            # 1. Read file
            file_bytes = Path(doc.storage_path).read_bytes()
            
            # 2. Parse
            elements = parse_document(file_bytes, doc.mime_type)
            
            # 3. Chunk
            chunks = chunk_elements(elements, max_tokens=500, overlap=50)
            
            # 4. Store chunks
            await self._store_chunks(doc.id, chunks)
            
            # 5. Update document
            doc.total_chunks = len(chunks)
            doc.status = DocumentStatus.READY
            doc.processing_error = None
            await self.db.flush()
            
            # 6. Complete job
            await self._update_job_status(
                job.id, 
                ProcessingJobStatus.COMPLETED, 
                completed=True,
                chunks_created=len(chunks)
            )
            
        except Exception as e:
            await self._handle_failure(job, doc, str(e))
            raise
    
    async def _get_document(self, doc_id) -> Optional[Document]:
        result = await self.db.execute(
            select(Document).where(Document.id == doc_id)
        )
        return result.scalar_one_or_none()
    
    async def _store_chunks(self, document_id, chunks: List[DocumentChunk]) -> None:
        """Store chunks in database."""
        for chunk in chunks:
            db_chunk = DocumentChunkModel(
                document_id=document_id,
                content=chunk.content,
                page_number=chunk.page_number,
                slide_number=chunk.slide_number,
                sheet_name=chunk.sheet_name,
                heading=chunk.heading,
                chunk_index=chunk.chunk_index,
                token_count=chunk.token_count,
                metadata_json=chunk.metadata,
                is_active=True,
            )
            self.db.add(db_chunk)
        await self.db.flush()
    
    async def _update_doc_status(self, doc_id, status: DocumentStatus) -> None:
        await self.db.execute(
            update(Document)
            .where(Document.id == doc_id)
            .values(status=status)
        )
        await self.db.flush()
    
    async def _update_job_status(
        self, 
        job_id, 
        status: ProcessingJobStatus, 
        started: bool = False,
        completed: bool = False,
        chunks_created: int = 0,
        error: str = None,
    ) -> None:
        from datetime import datetime, UTC
        
        values = {"status": status}
        if started:
            values["started_at"] = datetime.now(UTC)
        if completed:
            values["completed_at"] = datetime.now(UTC)
            values["chunks_created"] = chunks_created
        if error:
            values["error_message"] = error
            values["error_details"] = {"error": error}
        
        await self.db.execute(
            update(DocumentProcessingJob)
            .where(DocumentProcessingJob.id == job_id)
            .values(**values)
        )
        await self.db.flush()
    
    async def _handle_failure(self, job: DocumentProcessingJob, doc: Document, error: str) -> None:
        """Handle processing failure with retry logic."""
        max_retries = self.settings.WORKER_MAX_RETRIES
        
        if job.retry_count < max_retries:
            # Schedule retry
            job.retry_count += 1
            job.status = ProcessingJobStatus.PENDING
            job.error_message = error
            job.error_details = {"error": error, "retry": job.retry_count}
            doc.status = DocumentStatus.UPLOADED
        else:
            # Max retries exceeded
            job.status = ProcessingJobStatus.FAILED
            job.error_message = error
            job.error_details = {"error": error, "max_retries_exceeded": True}
            doc.status = DocumentStatus.FAILED
            doc.processing_error = error
        
        await self.db.flush()