"""
VibeGPT API – Document Upload Schemas
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.document import DocumentStatus, ProcessingJobStatus, SourceType


class DocumentUploadRequest(BaseModel):
    subject_id: UUID = Field()
    module_id: UUID | None = None
    source_type: SourceType = Field(default=SourceType.OTHER)
    description: str | None = Field(default=None, max_length=2000)
    topic: str | None = Field(default=None, max_length=500)

    model_config = {"use_enum_values": True}


class DocumentUploadResponse(BaseModel):
    id: UUID
    document_name: str
    original_filename: str
    status: DocumentStatus
    source_type: SourceType
    file_size: int
    message: str = "Document uploaded successfully"

    model_config = {"from_attributes": True}


class DocumentChunkResponse(BaseModel):
    id: UUID
    document_id: UUID
    content: str
    page_number: int | None = None
    slide_number: int | None = None
    sheet_name: str | None = None
    heading: str | None = None
    chunk_index: int
    token_count: int
    is_active: bool

    model_config = {"from_attributes": True}


class DocumentDetailResponse(BaseModel):
    id: UUID
    document_name: str
    original_filename: str
    storage_path: str
    file_hash: str
    mime_type: str
    file_size: int
    source_type: SourceType
    priority: int
    version: int
    status: DocumentStatus
    description: str | None = None
    topic: str | None = None
    uploaded_by: UUID
    is_active: bool
    published_at: datetime | None = None
    published_by: UUID | None = None
    total_chunks: int
    processing_error: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProcessingJobResponse(BaseModel):
    id: UUID
    document_id: UUID
    status: ProcessingJobStatus
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error_message: str | None = None
    error_details: dict | None = None
    chunks_created: int
    retry_count: int
    triggered_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
