"""
VibeGPT – Mock Embedding Service

Placeholder for Athul's embedding service integration.
Returns zero vectors for testing worker pipeline.
"""

from __future__ import annotations

import logging
from typing import List

import numpy as np

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Embedding service for generating vector representations of text chunks.
    
    TODO: Replace with Athul's implementation (Task AT1).
    Currently returns deterministic zero vectors for testing.
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.dim = 384  # all-MiniLM-L6-v2 dimension
        self._model = None
    
    def _load_model(self):
        """Lazy load the embedding model."""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.settings.EMBEDDING_MODEL)
                logger.info(f"Loaded embedding model: {self.settings.EMBEDDING_MODEL}")
            except Exception as e:
                logger.warning(f"Could not load sentence-transformers: {e}. Using mock embeddings.")
                self._model = None
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts.
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors (each 384 dimensions)
        """
        if not texts:
            return []
        
        self._load_model()
        
        if self._model is not None:
            try:
                embeddings = self._model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
                return embeddings.tolist()
            except Exception as e:
                logger.error(f"Embedding generation failed: {e}")
        
        # Fallback: deterministic mock embeddings
        return self._mock_embeddings(texts)
    
    def embed_single(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        return self.embed_texts([text])[0]
    
    def _mock_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate deterministic mock embeddings for testing.
        Uses hash of text to create reproducible vectors.
        """
        embeddings = []
        for text in texts:
            # Use hash to create deterministic "random" vector
            seed = hash(text) % (2**32)
            rng = np.random.default_rng(seed)
            vec = rng.normal(0, 1, self.dim)
            # Normalize to unit length
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            embeddings.append(vec.tolist())
        return embeddings
    
    def validate_dimension(self, embeddings: List[List[float]]) -> bool:
        """Validate all embeddings have correct dimension."""
        return all(len(e) == self.dim for e in embeddings)


# Singleton instance
_embedding_service = None


def get_embedding_service() -> EmbeddingService:
    """Get singleton embedding service instance."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service


def embed_chunks(chunks: List[str]) -> List[List[float]]:
    """Convenience function to embed chunks."""
    return get_embedding_service().embed_texts(chunks)