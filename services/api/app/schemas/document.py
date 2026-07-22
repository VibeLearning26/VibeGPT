"""
VibeGPT API – Document Upload Schemas
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.document import DocumentStatus, SourceType


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


class ProcessingJobResponse(BaseModel):
    id: UUID
    document_id: UUID
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
