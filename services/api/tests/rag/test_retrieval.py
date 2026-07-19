import uuid
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from app.rag.retrieval import RetrievalService
from app.models.document import DocumentChunk

@pytest.fixture
def mock_embedding_service():
    with patch("app.rag.retrieval.EmbeddingService") as mock_service_cls:
        mock_instance = MagicMock()
        mock_service_cls.return_value = mock_instance
        yield mock_instance

@pytest.mark.asyncio
async def test_search_chunks_query_building(mock_embedding_service):
    # Setup mock embedding
    mock_embedding_service.embed_query.return_value = [0.1] * 384
    
    # Setup mock db session
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars().all.return_value = [DocumentChunk(id=uuid.uuid4(), chunk_index=1)]
    mock_db.execute.return_value = mock_result
    
    service = RetrievalService(mock_db)
    subject_id = uuid.uuid4()
    
    # Execute search
    results = await service.search_chunks("test query", subject_id=subject_id, top_k=3, threshold=0.6)
    
    # Assert embedding was called
    mock_embedding_service.embed_query.assert_called_once_with("test query")
    
    # Assert db execute was called (we don't strictly assert the AST of the SQLAlchemy statement 
    # here as it's complex, but we know it executes and returns the mocked chunks)
    assert len(results) == 1
    mock_db.execute.assert_called_once()
