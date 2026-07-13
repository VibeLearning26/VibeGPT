"""
VibeGPT API – Admin Endpoints

CRUD for departments, semesters, academic years, subjects, modules, users.
Document upload, processing, publishing.
Dashboard, feedback, audit logs.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Query, UploadFile, File, Form
from sqlalchemy import select, func, and_

from app.core.dependencies import AdminUser, DbSession
from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.models.academic import (
    AcademicYear, Department, Module, Semester, Subject, StudentSubjectPermission,
)
from app.models.document import Document, DocumentProcessingJob, DocumentStatus, ProcessingJobStatus
from app.models.question import Feedback, QuestionLog
from app.models.user import User, UserRole
from app.models.system import AuditLog
from app.schemas.academic import (
    AcademicYearCreate, AcademicYearResponse, AcademicYearUpdate,
    DepartmentCreate, DepartmentResponse, DepartmentUpdate,
    ModuleCreate, ModuleResponse, ModuleUpdate,
    SemesterCreate, SemesterResponse, SemesterUpdate,
    SubjectCreate, SubjectResponse, SubjectUpdate,
    UserCreate, UserResponse, UserUpdate,
)
from app.schemas.common import IDResponse, MessageResponse

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
        select(Department).where(Department.archived_at == None).order_by(Department.name)
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
        select(Semester).where(Semester.archived_at == None).order_by(Semester.number)
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
        select(AcademicYear).where(AcademicYear.archived_at == None).order_by(AcademicYear.start_year.desc())
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
        select(Subject).where(Subject.archived_at == None).order_by(Subject.name)
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
    query = select(Module).where(Module.archived_at == None)
    if subject_id:
        query = query.where(Module.subject_id == subject_id)
    result = await db.execute(query.order_by(Module.number))
    return [ModuleResponse.model_validate(m) for m in result.scalars().all()]


# ── Users CRUD ───────────────────────────────────────────────

@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(body: UserCreate, current_user: AdminUser, db: DbSession):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise ConflictError(f"User with email '{body.email}' already exists")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=UserRole(body.role),
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
    query = select(User).where(User.archived_at == None)
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

@router.get("/documents")
async def list_documents(
    current_user: AdminUser,
    db: DbSession,
    status: str | None = None,
    subject_id: UUID | None = None,
):
    query = select(Document).where(Document.archived_at == None)
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
            "id": str(l.id),
            "user_id": str(l.user_id) if l.user_id else None,
            "action": l.action,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "details": l.details,
            "created_at": l.created_at.isoformat(),
        }
        for l in logs
    ]
