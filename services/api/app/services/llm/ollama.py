"""
VibeGPT – Ollama Integration (Placeholder)

Local LLM inference via Ollama.
To be implemented in AT1/AT2 phase.

Configuration:
- OLLAMA_BASE_URL: http://localhost:11434 (default)
- OLLAMA_MODEL: llama3.1:8b (default)
- OLLAMA_TIMEOUT: 120s (default)
"""

from __future__ import annotations

import logging
from typing import List, Optional

logger = logging.getLogger(__name__)


class OllamaService:
    """
    Ollama local LLM service.
    
    Currently a stub - will be implemented when Ollama infrastructure is ready.
    """
    
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3.1:8b", timeout: int = 120):
        self.base_url = base_url
        self.model = model
        self.timeout = timeout
        self._available = False
        logger.info(f"OllamaService initialized (stub): {base_url}, model={model}")
    
    async def health_check(self) -> bool:
        """Check if Ollama server is reachable and model is loaded."""
        # TODO: Implement actual health check
        # async with aiohttp.ClientSession() as session:
        #     async with session.get(f"{self.base_url}/api/tags") as resp:
        #         if resp.status == 200:
        #             data = await resp.json()
        #             return any(m['name'] == self.model for m in data.get('models', []))
        return self._available
    
    async def ensure_model(self) -> bool:
        """Pull model if not present."""
        # TODO: Implement model pull
        return True
    
    async def embed(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for texts."""
        # TODO: Implement via /api/embeddings
        # For now, return zero vectors matching all-MiniLM-L6-v2 dimension
        return [[0.0] * 384 for _ in texts]
    
    async def chat(self, messages: List[dict], **kwargs) -> str:
        """Chat completion via Ollama."""
        # TODO: Implement via /api/chat
        return "Ollama not yet configured. Please implement OllamaService.chat()"
    
    async def generate(self, prompt: str, **kwargs) -> str:
        """Generate completion."""
        return await self.chat([{"role": "user", "content": prompt}])
    
    @property
    def is_available(self) -> bool:
        return self._available


# Global instance (lazy initialization)
_ollama_service = None


def get_ollama_service() -> OllamaService:
    """Get or create Ollama service singleton."""
    global _ollama_service
    if _ollama_service is None:
        from app.core.config import get_settings
        settings = get_settings()
        _ollama_service = OllamaService(
            base_url=getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434"),
            model=getattr(settings, "OLLAMA_MODEL", "llama3.1:8b"),
            timeout=getattr(settings, "OLLAMA_TIMEOUT", 120),
        )
    return _ollama_service