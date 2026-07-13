"""
VibeGPT API – Student Endpoints

GET  /api/v1/student/subjects
GET  /api/v1/student/subjects/{subject_id}/modules
POST /api/v1/student/answers
GET  /api/v1/student/history
GET  /api/v1/student/history/{question_id}
POST /api/v1/student/history/{question_id}/save
DELETE /api/v1/student/history/{question_id}/save
POST /api/v1/student/feedback
GET  /api/v1/student/saved-answers
GET  /api/v1/student/profile
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.core.dependencies import DbSession, StudentUser
from app.core.exceptions import NotFoundError, AuthorizationError
from app.models.academic import Module, StudentSubjectPermission, Subject
from app.models.question import Feedback, QuestionLog, QuestionSource, SavedAnswer
from app.schemas.academic import ModuleResponse, SubjectResponse
from app.schemas.auth import UserProfile
from app.schemas.common import MessageResponse
from app.schemas.question import (
    AnswerResponse,
    AskQuestionRequest,
    FeedbackRequest,
    HistoryItem,
    SourceInfo,
    ValidationResult,
)

router = APIRouter(prefix="/student", tags=["Student"])


@router.get("/subjects", response_model=list[SubjectResponse])
async def get_student_subjects(current_user: StudentUser, db: DbSession):
    """Get subjects the student has access to."""
    result = await db.execute(
        select(Subject)
        .join(StudentSubjectPermission)
        .where(
            and_(
                StudentSubjectPermission.user_id == current_user.id,
                StudentSubjectPermission.is_active == True,
                Subject.is_active == True,
                Subject.archived_at == None,
            )
        )
    )
    subjects = result.scalars().all()
    return [SubjectResponse.model_validate(s) for s in subjects]


@router.get("/subjects/{subject_id}/modules", response_model=list[ModuleResponse])
async def get_subject_modules(subject_id: UUID, current_user: StudentUser, db: DbSession):
    """Get modules for a subject (must have access)."""
    # Verify access
    perm = await db.execute(
        select(StudentSubjectPermission).where(
            and_(
                StudentSubjectPermission.user_id == current_user.id,
                StudentSubjectPermission.subject_id == subject_id,
                StudentSubjectPermission.is_active == True,
            )
        )
    )
    if perm.scalar_one_or_none() is None:
        raise AuthorizationError("You do not have access to this subject")

    result = await db.execute(
        select(Module)
        .where(and_(Module.subject_id == subject_id, Module.is_active == True, Module.archived_at == None))
        .order_by(Module.number)
    )
    modules = result.scalars().all()
    return [ModuleResponse.model_validate(m) for m in modules]


@router.post("/answers", response_model=AnswerResponse)
async def ask_question(body: AskQuestionRequest, current_user: StudentUser, db: DbSession):
    """
    Submit a question and receive an exam-ready answer.
    This is the core RAG endpoint — skeleton for Phase 1.
    """
    # Verify subject access
    perm = await db.execute(
        select(StudentSubjectPermission).where(
            and_(
                StudentSubjectPermission.user_id == current_user.id,
                StudentSubjectPermission.subject_id == body.subject_id,
                StudentSubjectPermission.is_active == True,
            )
        )
    )
    if perm.scalar_one_or_none() is None:
        raise AuthorizationError("You do not have access to this subject")

    # Phase 1 skeleton: create question log with placeholder
    # Full RAG pipeline will be implemented in Phase 5
    import time
    start_time = time.time()

    question_log = QuestionLog(
        user_id=current_user.id,
        subject_id=body.subject_id,
        module_id=body.module_id,
        marks=body.marks,
        question=body.question,
        answer="RAG pipeline not yet configured. This endpoint will generate answers once document processing and Ollama are set up.",
        answer_status="completed",
        word_count=0,
        model_name="pending-setup",
        prompt_version="v1",
        processing_time_ms=int((time.time() - start_time) * 1000),
    )
    db.add(question_log)
    await db.flush()
    await db.refresh(question_log)

    return AnswerResponse(
        id=question_log.id,
        status=question_log.answer_status,
        answer=question_log.answer,
        word_count=question_log.word_count,
        marks=question_log.marks,
        question=question_log.question,
        sources=[],
        model=question_log.model_name,
        processing_ms=question_log.processing_time_ms,
        validation=ValidationResult(),
        created_at=question_log.created_at,
    )


@router.get("/history", response_model=list[HistoryItem])
async def get_history(
    current_user: StudentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Get the student's question history."""
    offset = (page - 1) * page_size
    result = await db.execute(
        select(QuestionLog)
        .where(QuestionLog.user_id == current_user.id)
        .order_by(QuestionLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .options(selectinload(QuestionLog.subject), selectinload(QuestionLog.module))
    )
    logs = result.scalars().all()

    items = []
    for log in logs:
        # Check if saved
        saved = await db.execute(
            select(SavedAnswer).where(
                and_(SavedAnswer.question_log_id == log.id, SavedAnswer.user_id == current_user.id)
            )
        )
        items.append(
            HistoryItem(
                id=log.id,
                subject_name=log.subject.name if log.subject else "Unknown",
                module_name=log.module.name if log.module else None,
                marks=log.marks,
                question=log.question,
                answer_preview=log.answer[:200] if log.answer else None,
                status=log.answer_status,
                created_at=log.created_at,
                is_saved=saved.scalar_one_or_none() is not None,
            )
        )
    return items


@router.get("/history/{question_id}", response_model=AnswerResponse)
async def get_history_detail(question_id: UUID, current_user: StudentUser, db: DbSession):
    """Get full details of a past question and answer."""
    result = await db.execute(
        select(QuestionLog)
        .where(and_(QuestionLog.id == question_id, QuestionLog.user_id == current_user.id))
        .options(selectinload(QuestionLog.sources))
    )
    log = result.scalar_one_or_none()
    if log is None:
        raise NotFoundError("Question")

    sources = [
        SourceInfo(
            label=s.label,
            document_id=s.document_id,
            document_name="",  # Will be resolved in Phase 5
            page_number=s.page_number,
            slide_number=s.slide_number,
            preview=s.preview,
            relevance_score=s.relevance_score,
        )
        for s in log.sources
    ]

    return AnswerResponse(
        id=log.id,
        status=log.answer_status,
        answer=log.answer,
        word_count=log.word_count,
        marks=log.marks,
        question=log.question,
        sources=sources,
        model=log.model_name,
        processing_ms=log.processing_time_ms,
        validation=ValidationResult(**(log.validation_result or {})) if log.validation_result else None,
        created_at=log.created_at,
    )


@router.post("/history/{question_id}/save", response_model=MessageResponse)
async def save_answer(question_id: UUID, current_user: StudentUser, db: DbSession):
    """Save/bookmark an answer."""
    # Verify ownership
    result = await db.execute(
        select(QuestionLog).where(
            and_(QuestionLog.id == question_id, QuestionLog.user_id == current_user.id)
        )
    )
    if result.scalar_one_or_none() is None:
        raise NotFoundError("Question")

    existing = await db.execute(
        select(SavedAnswer).where(
            and_(SavedAnswer.question_log_id == question_id, SavedAnswer.user_id == current_user.id)
        )
    )
    if existing.scalar_one_or_none() is not None:
        return MessageResponse(message="Already saved")

    db.add(SavedAnswer(user_id=current_user.id, question_log_id=question_id))
    await db.flush()
    return MessageResponse(message="Answer saved")


@router.delete("/history/{question_id}/save", response_model=MessageResponse)
async def unsave_answer(question_id: UUID, current_user: StudentUser, db: DbSession):
    """Remove a saved/bookmarked answer."""
    result = await db.execute(
        select(SavedAnswer).where(
            and_(SavedAnswer.question_log_id == question_id, SavedAnswer.user_id == current_user.id)
        )
    )
    saved = result.scalar_one_or_none()
    if saved is None:
        raise NotFoundError("Saved answer")

    await db.delete(saved)
    await db.flush()
    return MessageResponse(message="Answer removed from saved")


@router.post("/feedback", response_model=MessageResponse)
async def submit_feedback(body: FeedbackRequest, current_user: StudentUser, db: DbSession):
    """Submit feedback/rating for an answer."""
    # Verify ownership
    result = await db.execute(
        select(QuestionLog).where(
            and_(QuestionLog.id == body.question_log_id, QuestionLog.user_id == current_user.id)
        )
    )
    if result.scalar_one_or_none() is None:
        raise NotFoundError("Question")

    # Check for existing feedback
    existing = await db.execute(
        select(Feedback).where(
            and_(Feedback.question_log_id == body.question_log_id, Feedback.user_id == current_user.id)
        )
    )
    if existing.scalar_one_or_none() is not None:
        return MessageResponse(message="Feedback already submitted")

    db.add(
        Feedback(
            user_id=current_user.id,
            question_log_id=body.question_log_id,
            rating=body.rating,
            comment=body.comment,
        )
    )
    await db.flush()
    return MessageResponse(message="Feedback submitted")


@router.get("/saved-answers", response_model=list[HistoryItem])
async def get_saved_answers(current_user: StudentUser, db: DbSession):
    """Get all saved/bookmarked answers."""
    result = await db.execute(
        select(QuestionLog)
        .join(SavedAnswer, and_(SavedAnswer.question_log_id == QuestionLog.id, SavedAnswer.user_id == current_user.id))
        .order_by(SavedAnswer.created_at.desc())
        .options(selectinload(QuestionLog.subject), selectinload(QuestionLog.module))
    )
    logs = result.scalars().all()
    return [
        HistoryItem(
            id=log.id,
            subject_name=log.subject.name if log.subject else "Unknown",
            module_name=log.module.name if log.module else None,
            marks=log.marks,
            question=log.question,
            answer_preview=log.answer[:200] if log.answer else None,
            status=log.answer_status,
            created_at=log.created_at,
            is_saved=True,
        )
        for log in logs
    ]


@router.get("/profile", response_model=UserProfile)
async def get_profile(current_user: StudentUser):
    """Get student profile."""
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value,
        department_id=current_user.department_id,
        semester_id=current_user.semester_id,
        avatar_url=current_user.avatar_url,
        is_active=current_user.is_active,
        last_login_at=current_user.last_login_at,
        created_at=current_user.created_at,
    )
