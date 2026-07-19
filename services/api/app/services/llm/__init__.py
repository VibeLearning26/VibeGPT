"""
VibeGPT – LLM Services Package

Provides unified interface for different LLM providers:
- Ollama (local/self-hosted)
- OpenRouter (multi-model gateway)
"""

from app.services.llm.ollama import OllamaService, get_ollama_service
from app.services.llm.openrouter import OpenRouterService, get_openrouter_service

__all__ = [
    "OllamaService",
    "get_ollama_service",
    "OpenRouterService",
    "get_openrouter_service",
]