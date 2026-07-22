"""
VibeGPT API – Admin Endpoints

CRUD for departments, semesters, academic years, subjects, modules, users.
Document upload, processing, publishing.
Dashboard, feedback, audit logs.
"""

from __future__ import annotations

import hashlib
import io
import uuid
import zipfile
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import func, select

from app.core.config import get_settings
from app.core.dependencies import AdminUser, DbSession
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.security import hash_password, validate_password_strength
from app.models.academic import (
    AcademicYear,
    Department,
    Module,
    Semester,
    Subject,
)
from app.models.document import (
    Document,
    DocumentProcessingJob,
    DocumentStatus,
    ProcessingJobStatus,
    SourceType,
)
from app.models.question import Feedback, QuestionLog
from app.models.system import AuditLog
from app.models.user import User, UserRole
from app.schemas.academic import (
    AcademicYearCreate,
    AcademicYearResponse,
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
    ModuleCreate,
    ModuleResponse,
    ModuleUpdate,
    SemesterCreate,
    SemesterResponse,
    SubjectCreate,
    SubjectResponse,
    SubjectUpdate,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from app.schemas.common import MessageResponse
from app.schemas.document import DocumentUploadResponse
from app.storage import get_document_storage

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Dashboard ────────────────────────────────────────────────

@router.get("/dashboard")
async def get_dashboard(current_user: AdminUser, db: DbSession):
    """Admin dashboard with real statistics."""
    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)

    published_docs = await db.execute(
        select(func.count()).select_from(Document).where(Document.status == DocumentStatus.PUBLISHED)
    )
    pending_docs = await db.execute(
        select(func.count()).select_from(Document).where(Document.status == DocumentStatus.UPLOADED)
    )
    review_docs = await db.execute(
        select(func.count()).select_from(Document).where(Document.status == DocumentStatus.NEEDS_REVIEW)
    )
    failed_jobs = await db.execute(
        select(func.count()).select_from(DocumentProcessingJob)
        .where(DocumentProcessingJob.status == ProcessingJobStatus.FAILED)
    )
    total_students = await db.execute(
        select(func.count()).select_from(User).where(User.role == UserRole.STUDENT)
    )
    questions_today = await db.execute(
        select(func.count()).select_from(QuestionLog).where(QuestionLog.created_at >= today_start)
    )
    avg_time = await db.execute(
        select(func.avg(QuestionLog.processing_time_ms)).select_from(QuestionLog)
    )
    low_rated = await db.execute(
        select(func.count()).select_from(Feedback).where(Feedback.rating <= 2)
    )

    return {
        "published_documents": published_docs.scalar() or 0,
        "pending_documents": pending_docs.scalar() or 0,
        "review_documents": review_docs.scalar() or 0,
        "failed_jobs": failed_jobs.scalar() or 0,
        "total_students": total_students.scalar() or 0,
        "questions_today": questions_today.scalar() or 0,
        "avg_processing_ms": round(avg_time.scalar() or 0),
        "low_rated_answers": low_rated.scalar() or 0,
    }


# ── Departments CRUD ─────────────────────────────────────────

@router.post("/departments", response_model=DepartmentResponse, status_code=201)
async def create_department(body: DepartmentCreate, current_user: AdminUser, db: DbSession):
    existing = await db.execute(select(Department).where(Department.code == body.code))
    if existing.scalar_one_or_none():
        raise ConflictError(f"Department with code '{body.code}' already exists")

    dept = Department(**body.model_dump())
    db.add(dept)
    await db.flush()
    await db.refresh(dept)
    return DepartmentResponse.model_validate(dept)


@router.get("/departments", response_model=list[DepartmentResponse])
async def list_departments(current_user: AdminUser, db: DbSession):
    result = await db.execute(
        select(Department).where(Department.archived_at.is_(None)).order_by(Department.name)
    )
    return [DepartmentResponse.model_validate(d) for d in result.scalars().all()]


@router.patch("/departments/{dept_id}", response_model=DepartmentResponse)
async def update_department(dept_id: UUID, body: DepartmentUpdate, current_user: AdminUser, db: DbSession):
    result = await db.execute(select(Department).where(Department.id == dept_id))
    dept = result.scalar_one_or_none()
    if not dept:
        raise NotFoundError("Department")
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(dept, key, val)
    await db.flush()
    await db.refresh(dept)
    return DepartmentResponse.model_validate(dept)


@router.delete("/departments/{dept_id}", response_model=MessageResponse)
async def archive_department(dept_id: UUID, current_user: AdminUser, db: DbSession):
    result = await db.execute(select(Department).where(Department.id == dept_id))
    dept = result.scalar_one_or_none()
    if not dept:
        raise NotFoundError("Department")
    dept.archived_at = datetime.now(UTC)
    await db.flush()
    return MessageResponse(message="Department archived")


# ── Semesters CRUD ───────────────────────────────────────────

@router.post("/semesters", response_model=SemesterResponse, status_code=201)
async def create_semester(body: SemesterCreate, current_user: AdminUser, db: DbSession):
    sem = Semester(**body.model_dump())
    db.add(sem)
    await db.flush()
    await db.refresh(sem)
    return SemesterResponse.model_validate(sem)


@router.get("/semesters", response_model=list[SemesterResponse])
async def list_semesters(current_user: AdminUser, db: DbSession):
    result = await db.execute(
        select(Semester).where(Semester.archived_at.is_(None)).order_by(Semester.number)
    )
    return [SemesterResponse.model_validate(s) for s in result.scalars().all()]


# ── Academic Years CRUD ──────────────────────────────────────

@router.post("/academic-years", response_model=AcademicYearResponse, status_code=201)
async def create_academic_year(body: AcademicYearCreate, current_user: AdminUser, db: DbSession):
    ay = AcademicYear(**body.model_dump())
    db.add(ay)
    await db.flush()
    await db.refresh(ay)
    return AcademicYearResponse.model_validate(ay)


@router.get("/academic-years", response_model=list[AcademicYearResponse])
async def list_academic_years(current_user: AdminUser, db: DbSession):
    result = await db.execute(
        select(AcademicYear)
        .where(AcademicYear.archived_at.is_(None))
        .order_by(AcademicYear.start_year.desc())
    )
    return [AcademicYearResponse.model_validate(ay) for ay in result.scalars().all()]


# ── Subjects CRUD ────────────────────────────────────────────

@router.post("/subjects", response_model=SubjectResponse, status_code=201)
async def create_subject(body: SubjectCreate, current_user: AdminUser, db: DbSession):
    subj = Subject(**body.model_dump())
    db.add(subj)
    await db.flush()
    await db.refresh(subj)
    return SubjectResponse.model_validate(subj)


@router.get("/subjects", response_model=list[SubjectResponse])
async def list_subjects(current_user: AdminUser, db: DbSession):
    result = await db.execute(
        select(Subject).where(Subject.archived_at.is_(None)).order_by(Subject.name)
    )
    return [SubjectResponse.model_validate(s) for s in result.scalars().all()]


@router.patch("/subjects/{subject_id}", response_model=SubjectResponse)
async def update_subject(subject_id: UUID, body: SubjectUpdate, current_user: AdminUser, db: DbSession):
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subj = result.scalar_one_or_none()
    if not subj:
        raise NotFoundError("Subject")
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(subj, key, val)
    await db.flush()
    await db.refresh(subj)
    return SubjectResponse.model_validate(subj)


@router.delete("/subjects/{subject_id}", response_model=MessageResponse)
async def archive_subject(subject_id: UUID, current_user: AdminUser, db: DbSession):
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subj = result.scalar_one_or_none()
    if not subj:
        raise NotFoundError("Subject")
    subj.archived_at = datetime.now(UTC)
    await db.flush()
    return MessageResponse(message="Subject archived")


# ── Modules CRUD ─────────────────────────────────────────────

@router.post("/modules", response_model=ModuleResponse, status_code=201)
async def create_module(body: ModuleCreate, current_user: AdminUser, db: DbSession):
    mod = Module(**body.model_dump())
    db.add(mod)
    await db.flush()
    await db.refresh(mod)
    return ModuleResponse.model_validate(mod)


@router.get("/modules", response_model=list[ModuleResponse])
async def list_modules(current_user: AdminUser, db: DbSession, subject_id: UUID | None = None):
    query = select(Module).where(Module.archived_at.is_(None))
    if subject_id:
        query = query.where(Module.subject_id == subject_id)
    result = await db.execute(query.order_by(Module.number))
    return [ModuleResponse.model_validate(m) for m in result.scalars().all()]


@router.patch("/modules/{module_id}", response_model=ModuleResponse)
async def update_module(module_id: UUID, body: ModuleUpdate, current_user: AdminUser, db: DbSession):
    result = await db.execute(select(Module).where(Module.id == module_id))
    mod = result.scalar_one_or_none()
    if not mod:
        raise NotFoundError("Module")
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(mod, key, val)
    await db.flush()
    await db.refresh(mod)
    return ModuleResponse.model_validate(mod)


@router.delete("/modules/{module_id}", response_model=MessageResponse)
async def archive_module(module_id: UUID, current_user: AdminUser, db: DbSession):
    result = await db.execute(select(Module).where(Module.id == module_id))
    mod = result.scalar_one_or_none()
    if not mod:
        raise NotFoundError("Module")
    mod.archived_at = datetime.now(UTC)
    await db.flush()
    return MessageResponse(message="Module archived")


# ── Users CRUD ───────────────────────────────────────────────

@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(body: UserCreate, current_user: AdminUser, db: DbSession):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise ConflictError(f"User with email '{body.email}' already exists")

    password_issues = validate_password_strength(body.password)
    if password_issues:
        raise ValidationError("; ".join(password_issues))

    try:
        role = UserRole(body.role)
    except ValueError as exc:
        raise ValidationError("Invalid user role") from exc

    if body.department_id is not None:
        department = await db.execute(
            select(Department).where(
                Department.id == body.department_id,
                Department.is_active == True,  # noqa: E712
                Department.archived_at.is_(None),
            )
        )
        if department.scalar_one_or_none() is None:
            raise NotFoundError("Department")

    if body.semester_id is not None:
        semester = await db.execute(
            select(Semester).where(
                Semester.id == body.semester_id,
                Semester.is_active == True,  # noqa: E712
                Semester.archived_at.is_(None),
            )
        )
        if semester.scalar_one_or_none() is None:
            raise NotFoundError("Semester")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=role,
        department_id=body.department_id,
        semester_id=body.semester_id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    current_user: AdminUser,
    db: DbSession,
    role: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    query = select(User).where(User.archived_at.is_(None))
    if role:
        query = query.where(User.role == UserRole(role))
    result = await db.execute(
        query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return [UserResponse.model_validate(u) for u in result.scalars().all()]


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: UUID, body: UserUpdate, current_user: AdminUser, db: DbSession):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User")
    update_data = body.model_dump(exclude_unset=True)
    if "role" in update_data:
        update_data["role"] = UserRole(update_data["role"])
    for key, val in update_data.items():
        setattr(user, key, val)
    await db.flush()
    await db.refresh(user)
    return UserResponse.model_validate(user)


# ── Documents ────────────────────────────────────────────────

# Private helpers for upload functionality

def _get_secure_filename(original_filename: str) -> str:
    import os
    ext = os.path.splitext(original_filename)[1]
    unique_id = uuid.uuid4().hex[:12]
    return f"{unique_id}{ext}"


def _validate_file_type(filename: str) -> str:
    ext = filename.lower().split(".")[-1] if "." in filename else ""
    mime_map = {
        "pdf": "application/pdf",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    if ext not in mime_map:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
    return mime_map[ext]


def _validate_file_content(file_bytes: bytes, extension: str) -> None:
    """Reject empty, corrupt, or extension-spoofed supported documents."""
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    if extension == "pdf":
        if not file_bytes.startswith(b"%PDF-"):
            raise HTTPException(status_code=400, detail="File content is not a valid PDF")
        return

    expected_members = {
        "pptx": "ppt/presentation.xml",
        "docx": "word/document.xml",
        "xlsx": "xl/workbook.xml",
    }
    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as archive:
            if expected_members[extension] not in archive.namelist():
                raise HTTPException(
                    status_code=400,
                    detail=f"File content is not a valid {extension.upper()} document",
                )
    except zipfile.BadZipFile as exc:
        raise HTTPException(
            status_code=400,
            detail=f"File content is not a valid {extension.upper()} document",
        ) from exc


@router.post("/documents/upload", response_model=DocumentUploadResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    subject_id: UUID = Form(...),
    module_id: UUID | None = Form(None),
    source_type: str = Form(default="other"),
    description: str | None = Form(None, max_length=2000),
    topic: str | None = Form(None, max_length=500),
    *,
    current_user: AdminUser,
    db: DbSession,
):
    settings = get_settings()
    storage = get_document_storage()

    # Validate extension
    filename = file.filename or "unknown"
    ext = filename.lower().split(".")[-1] if "." in filename else ""
    if ext not in ("pdf", "pptx", "docx", "xlsx"):
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
    mime_type = _validate_file_type(filename)

    # Read file with size enforcement during read
    chunk_size = 1024 * 1024  # 1MB chunks
    sha256_hash = hashlib.sha256()
    file_size = 0
    file_buffer = bytearray()
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        sha256_hash.update(chunk)
        file_buffer.extend(chunk)
        file_size += len(chunk)
        if file_size > settings.max_upload_bytes:
            raise HTTPException(status_code=413, detail="File exceeds maximum size")

    file_bytes = bytes(file_buffer)
    file_hash = sha256_hash.hexdigest()
    _validate_file_content(file_bytes, ext)

    # Check for duplicates
    existing = await db.execute(
        select(Document)
        .where(Document.file_hash == file_hash)
        .where(Document.archived_at.is_(None))
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Document already exists")

    # Verify subject exists
    result = await db.execute(
        select(Subject).where(
            Subject.id == subject_id,
            Subject.is_active == True,  # noqa: E712
            Subject.archived_at.is_(None),
        )
    )
    if result.scalar_one_or_none() is None:
        raise NotFoundError("Subject")

    # Verify module if provided
    if module_id:
        result = await db.execute(
            select(Module).where(
                Module.id == module_id,
                Module.subject_id == subject_id,
                Module.is_active == True,  # noqa: E712
                Module.archived_at.is_(None),
            )
        )
        if result.scalar_one_or_none() is None:
            raise NotFoundError("Module", "Module not found in the selected subject")

    # Prepare secure storage path
    secure_name = _get_secure_filename(filename)
    object_key = f"subjects/{subject_id}/{secure_name}"
    stored_path_str = object_key

    try:
        source = SourceType(source_type)
    except ValueError as exc:
        allowed = ", ".join(item.value for item in SourceType)
        raise HTTPException(
            status_code=422,
            detail=f"Invalid source_type. Allowed values: {allowed}",
        ) from exc

    doc = None
    try:
        doc = Document(
            subject_id=subject_id,
            module_id=module_id,
            document_name=filename,
            original_filename=filename,
            storage_path=stored_path_str,
            file_hash=file_hash,
            mime_type=mime_type,
            file_size=file_size,
            source_type=source,
            description=description,
            topic=topic,
            uploaded_by=current_user.id,
            status=DocumentStatus.PROCESSING,
        )
        db.add(doc)
        await db.flush()
        await db.refresh(doc)

        job = DocumentProcessingJob(
            document_id=doc.id,
            status=ProcessingJobStatus.PENDING,
            triggered_by=current_user.id,
        )
        db.add(job)
        await db.flush()

        stored_path_str = await storage.put(object_key, file_bytes, mime_type)
        doc.storage_path = stored_path_str
        await db.flush()
    except Exception:
        await db.rollback()
        try:
            await storage.delete(stored_path_str)
        except Exception:
            pass
        raise

    # Commit now so the background task (separate session) can see the rows.
    await db.commit()

    # Kick off extraction → chunking → embedding after the response returns.
    # The dedicated worker atomically claims this pending job. Processing it
    # here as well would race the worker and can create duplicate chunks.

    return DocumentUploadResponse(
        id=doc.id,
        document_name=doc.document_name,
        original_filename=doc.original_filename,
        status=doc.status,
        source_type=doc.source_type,
        file_size=doc.file_size,
    )


@router.get("/documents")
async def list_documents(
    current_user: AdminUser,
    db: DbSession,
    status: str | None = None,
    subject_id: UUID | None = None,
):
    query = select(Document).where(Document.archived_at.is_(None))
    if status:
        query = query.where(Document.status == DocumentStatus(status))
    if subject_id:
        query = query.where(Document.subject_id == subject_id)
    result = await db.execute(query.order_by(Document.created_at.desc()))
    docs = result.scalars().all()
    return [
        {
            "id": str(d.id),
            "document_name": d.document_name,
            "original_filename": d.original_filename,
            "status": d.status.value,
            "source_type": d.source_type.value,
            "file_size": d.file_size,
            "total_chunks": d.total_chunks,
            "created_at": d.created_at.isoformat(),
        }
        for d in docs
    ]


@router.post("/documents/{document_id}/publish", response_model=MessageResponse)
async def publish_document(document_id: UUID, current_user: AdminUser, db: DbSession):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise NotFoundError("Document")
    if doc.status not in (DocumentStatus.READY, DocumentStatus.NEEDS_REVIEW):
        raise ConflictError(f"Cannot publish document with status '{doc.status.value}'")
    doc.status = DocumentStatus.PUBLISHED
    doc.published_at = datetime.now(UTC)
    doc.published_by = current_user.id
    await db.flush()
    return MessageResponse(message="Document published")


@router.post("/documents/{document_id}/archive", response_model=MessageResponse)
async def archive_document(document_id: UUID, current_user: AdminUser, db: DbSession):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise NotFoundError("Document")
    doc.status = DocumentStatus.ARCHIVED
    doc.archived_at = datetime.now(UTC)
    await db.flush()
    return MessageResponse(message="Document archived")


# ── Feedback ─────────────────────────────────────────────────

@router.get("/feedback")
async def list_feedback(
    current_user: AdminUser,
    db: DbSession,
    min_rating: int | None = None,
    max_rating: int | None = None,
):
    query = select(Feedback).order_by(Feedback.created_at.desc())
    if min_rating:
        query = query.where(Feedback.rating >= min_rating)
    if max_rating:
        query = query.where(Feedback.rating <= max_rating)
    result = await db.execute(query.limit(100))
    feedbacks = result.scalars().all()
    return [
        {
            "id": str(f.id),
            "user_id": str(f.user_id),
            "question_log_id": str(f.question_log_id),
            "rating": f.rating,
            "comment": f.comment,
            "admin_response": f.admin_response,
            "created_at": f.created_at.isoformat(),
        }
        for f in feedbacks
    ]


# ── Audit Logs ───────────────────────────────────────────────

@router.get("/audit-logs")
async def list_audit_logs(
    current_user: AdminUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    result = await db.execute(
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    logs = result.scalars().all()
    return [
        {
            "id": str(log.id),
            "user_id": str(log.user_id) if log.user_id else None,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]
