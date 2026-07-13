"""
VibeGPT – Model Registry

Import all models here so Alembic and SQLAlchemy can discover them.
"""

from app.models.user import User, UserRole, RefreshToken  # noqa: F401
from app.models.academic import (  # noqa: F401
    Department,
    Semester,
    AcademicYear,
    Subject,
    Module,
    StudentSubjectPermission,
)
from app.models.document import (  # noqa: F401
    Document,
    DocumentVersion,
    DocumentChunk,
    DocumentProcessingJob,
    DocumentStatus,
    SourceType,
    ProcessingJobStatus,
)
from app.models.question import (  # noqa: F401
    QuestionLog,
    QuestionSource,
    SavedAnswer,
    Feedback,
    AnswerStatus,
)
from app.models.answer_rule import AnswerRule, AnswerExample  # noqa: F401
from app.models.system import AuditLog, SystemSetting  # noqa: F401
