"""
VibeGPT API – Academic Metadata Schemas
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ── Department ───────────────────────────────────────────────

class DepartmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    code: str = Field(min_length=1, max_length=20)
    description: str | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    is_active: bool | None = None


class DepartmentResponse(BaseModel):
    id: UUID
    name: str
    code: str
    description: str | None = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Semester ─────────────────────────────────────────────────

class SemesterCreate(BaseModel):
    number: int = Field(ge=1, le=12)
    name: str = Field(min_length=2, max_length=100)


class SemesterUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None


class SemesterResponse(BaseModel):
    id: UUID
    number: int
    name: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Academic Year ────────────────────────────────────────────

class AcademicYearCreate(BaseModel):
    name: str = Field(min_length=4, max_length=50)
    start_year: int
    end_year: int
    is_current: bool = False


class AcademicYearUpdate(BaseModel):
    name: str | None = None
    is_current: bool | None = None
    is_active: bool | None = None


class AcademicYearResponse(BaseModel):
    id: UUID
    name: str
    start_year: int
    end_year: int
    is_current: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Subject ──────────────────────────────────────────────────

class SubjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    code: str = Field(min_length=1, max_length=20)
    description: str | None = None
    department_id: UUID
    semester_id: UUID
    credits: int | None = None


class SubjectUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    credits: int | None = None
    is_active: bool | None = None


class SubjectResponse(BaseModel):
    id: UUID
    name: str
    code: str
    description: str | None = None
    department_id: UUID
    semester_id: UUID
    credits: int | None = None
    is_active: bool
    created_at: datetime
    department_name: str | None = None
    semester_name: str | None = None

    model_config = {"from_attributes": True}


# ── Module ───────────────────────────────────────────────────

class ModuleCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    number: int = Field(ge=1)
    description: str | None = None
    subject_id: UUID


class ModuleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class ModuleResponse(BaseModel):
    id: UUID
    name: str
    number: int
    description: str | None = None
    subject_id: UUID
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── User Management ─────────────────────────────────────────

class UserCreate(BaseModel):
    email: str = Field(max_length=320)
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    role: str = "student"
    department_id: UUID | None = None
    semester_id: UUID | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    department_id: UUID | None = None
    semester_id: UUID | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    department_id: UUID | None = None
    semester_id: UUID | None = None
    is_active: bool
    last_login_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
