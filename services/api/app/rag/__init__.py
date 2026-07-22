"""VibeGPT RAG module — embedding, retrieval, and Ollama generation."""

from app.rag.embedding import EmbeddingError, EmbeddingService
from app.rag.generation import AnswerGenerationService, GenerationError, GenerationResult
from app.rag.ollama_client import (
    OllamaClient,
    OllamaConnectionError,
    OllamaEmptyResponseError,
    OllamaError,
    OllamaResponseError,
    OllamaTimeoutError,
)
from app.rag.retrieval import RetrievalService

__all__ = [
    "AnswerGenerationService",
    "EmbeddingError",
    "EmbeddingService",
    "GenerationError",
    "GenerationResult",
    "OllamaClient",
    "OllamaError",
    "OllamaConnectionError",
    "OllamaTimeoutError",
    "OllamaResponseError",
    "OllamaEmptyResponseError",
    "RetrievalService",
]
