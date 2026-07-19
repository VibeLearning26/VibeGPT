"""Package markers for RAG module"""

from app.rag.answer_service import AnswerService
from app.rag.ollama_client import (
    OllamaClient,
    OllamaConnectionError,
    OllamaEmptyResponseError,
    OllamaError,
    OllamaResponseError,
    OllamaTimeoutError,
)
from app.rag.prompt_builder import PromptBuilder
from app.rag.retrieval import RetrievalService

__all__ = [
    # V1 – Ollama client
    "OllamaClient",
    "OllamaError",
    "OllamaConnectionError",
    "OllamaTimeoutError",
    "OllamaResponseError",
    "OllamaEmptyResponseError",
    # V2 – RAG orchestration
    "PromptBuilder",
    "RetrievalService",
    "AnswerService",
]
