"""
VibeGPT – Model Registry

Import all models here so Alembic and SQLAlchemy can discover them.
"""

from app.models.academic import (  # noqa: F401
    AcademicYear,
    Department,
    Module,
    Semester,
    StudentSubjectPermission,
    Subject,
)
from app.models.answer_rule import AnswerExample, AnswerRule  # noqa: F401
from app.models.document import (  # noqa: F401
    Document,
    DocumentChunk,
    DocumentProcessingJob,
    DocumentStatus,
    DocumentVersion,
    ProcessingJobStatus,
    SourceType,
)
from app.models.question import (  # noqa: F401
    AnswerStatus,
    Feedback,
    QuestionLog,
    QuestionSource,
    SavedAnswer,
)
from app.models.system import AuditLog, SystemSetting  # noqa: F401
from app.models.user import RefreshToken, User, UserRole  # noqa: F401
