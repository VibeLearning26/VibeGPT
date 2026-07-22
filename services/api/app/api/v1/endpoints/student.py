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
from app.rag.generation import AnswerGenerationService
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
                StudentSubjectPermission.is_active.is_(True),
                Subject.is_active.is_(True),
                Subject.archived_at.is_(None),
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
                StudentSubjectPermission.is_active.is_(True),
            )
        )
    )
    if perm.scalar_one_or_none() is None:
        raise AuthorizationError("You do not have access to this subject")

    result = await db.execute(
        select(Module)
        .where(
            and_(
                Module.subject_id == subject_id,
                Module.is_active.is_(True),
                Module.archived_at.is_(None),
            )
        )
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
                StudentSubjectPermission.is_active.is_(True),
            )
        )
    )
    if perm.scalar_one_or_none() is None:
        raise AuthorizationError("You do not have access to this subject")

    # Full RAG pipeline: retrieve → prompt → Ollama → validate
    service = AnswerGenerationService(db)
    result = await service.generate(
        question=body.question,
        subject_id=body.subject_id,
        marks=body.marks,
        module_id=body.module_id,
    )

    question_log = QuestionLog(
        user_id=current_user.id,
        subject_id=body.subject_id,
        module_id=body.module_id,
        marks=body.marks,
        question=body.question,
        answer=result.answer,
        answer_status=result.status,
        word_count=result.word_count,
        model_name=result.model_name,
        prompt_version=result.prompt_version,
        retrieved_chunk_ids=[c.chunk_id for c in result.sources] or None,
        processing_time_ms=result.processing_ms,
        validation_result=result.validation or None,
    )
    db.add(question_log)
    await db.flush()

    for citation in result.sources:
        db.add(
            QuestionSource(
                question_log_id=question_log.id,
                chunk_id=citation.chunk_id,
                document_id=citation.document_id,
                label=citation.label,
                relevance_score=citation.relevance_score,
                page_number=citation.page_number,
                slide_number=citation.slide_number,
                preview=citation.preview,
            )
        )
    await db.flush()
    await db.refresh(question_log)

    return AnswerResponse(
        id=question_log.id,
        status=question_log.answer_status.value,
        answer=question_log.answer,
        word_count=question_log.word_count,
        marks=question_log.marks,
        question=question_log.question,
        sources=[
            SourceInfo(
                label=c.label,
                document_id=c.document_id,
                document_name=c.document_name,
                page_number=c.page_number,
                slide_number=c.slide_number,
                sheet_name=c.sheet_name,
                preview=c.preview,
                relevance_score=c.relevance_score,
            )
            for c in result.sources
        ],
        model=question_log.model_name,
        processing_ms=question_log.processing_time_ms,
        validation=ValidationResult(
            word_count_valid=result.validation.get("word_count_valid", True),
            citations_valid=result.validation.get("citations_valid", True),
            details=result.validation or None,
        ),
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
