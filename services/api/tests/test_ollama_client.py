"""
Unit tests for the OllamaClient.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.rag.ollama_client import (
    OllamaClient,
    OllamaConnectionError,
    OllamaEmptyResponseError,
    OllamaResponseError,
    OllamaTimeoutError,
)


@pytest.mark.asyncio
async def test_generate_success_without_system_prompt():
    client = OllamaClient(base_url="http://localhost:11434", model="llama3.2:3b")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "model": "llama3.2:3b",
        "message": {"role": "assistant", "content": "Hello there!"},
    }

    mock_client_instance = AsyncMock(spec=httpx.AsyncClient)
    mock_client_instance.__aenter__.return_value = mock_client_instance
    mock_client_instance.post.return_value = mock_response

    with patch("httpx.AsyncClient", return_value=mock_client_instance):
        result = await client.generate(prompt="Hi")
        assert result == "Hello there!"
        mock_client_instance.post.assert_called_once_with(
            "http://localhost:11434/api/chat",
            json={
                "model": "llama3.2:3b",
                "messages": [{"role": "user", "content": "Hi"}],
                "stream": False,
            },
        )


@pytest.mark.asyncio
async def test_generate_success_with_system_prompt():
    client = OllamaClient(base_url="http://localhost:11434", model="llama3.2:3b")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "model": "llama3.2:3b",
        "message": {"role": "assistant", "content": "Beep boop, I am a robot."},
    }

    mock_client_instance = AsyncMock(spec=httpx.AsyncClient)
    mock_client_instance.__aenter__.return_value = mock_client_instance
    mock_client_instance.post.return_value = mock_response

    with patch("httpx.AsyncClient", return_value=mock_client_instance):
        result = await client.generate(prompt="Who are you?", system_prompt="You are a robot.")
        assert result == "Beep boop, I am a robot."
        mock_client_instance.post.assert_called_once_with(
            "http://localhost:11434/api/chat",
            json={
                "model": "llama3.2:3b",
                "messages": [
                    {"role": "system", "content": "You are a robot."},
                    {"role": "user", "content": "Who are you?"},
                ],
                "stream": False,
            },
        )


@pytest.mark.asyncio
async def test_generate_timeout():
    client = OllamaClient(base_url="http://localhost:11434", model="llama3.2:3b", timeout=5.0)

    mock_client_instance = AsyncMock(spec=httpx.AsyncClient)
    mock_client_instance.__aenter__.return_value = mock_client_instance
    mock_client_instance.post.side_effect = httpx.TimeoutException("Timeout")

    with patch("httpx.AsyncClient", return_value=mock_client_instance):
        with pytest.raises(OllamaTimeoutError) as exc_info:
            await client.generate(prompt="Hi")
        assert "timed out after 5.0s" in str(exc_info.value)


@pytest.mark.asyncio
async def test_generate_connection_error():
    client = OllamaClient(base_url="http://localhost:11434", model="llama3.2:3b")

    mock_client_instance = AsyncMock(spec=httpx.AsyncClient)
    mock_client_instance.__aenter__.return_value = mock_client_instance
    mock_client_instance.post.side_effect = httpx.ConnectError("Connection refused")

    with patch("httpx.AsyncClient", return_value=mock_client_instance):
        with pytest.raises(OllamaConnectionError) as exc_info:
            await client.generate(prompt="Hi")
        assert "Failed to connect to Ollama server" in str(exc_info.value)


@pytest.mark.asyncio
async def test_generate_non_200_status():
    client = OllamaClient(base_url="http://localhost:11434", model="llama3.2:3b")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error"

    mock_client_instance = AsyncMock(spec=httpx.AsyncClient)
    mock_client_instance.__aenter__.return_value = mock_client_instance
    mock_client_instance.post.return_value = mock_response

    with patch("httpx.AsyncClient", return_value=mock_client_instance):
        with pytest.raises(OllamaResponseError) as exc_info:
            await client.generate(prompt="Hi")
        assert "Ollama returned HTTP status 500" in str(exc_info.value)


@pytest.mark.asyncio
async def test_generate_malformed_json():
    client = OllamaClient(base_url="http://localhost:11434", model="llama3.2:3b")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.side_effect = ValueError("No JSON object could be decoded")

    mock_client_instance = AsyncMock(spec=httpx.AsyncClient)
    mock_client_instance.__aenter__.return_value = mock_client_instance
    mock_client_instance.post.return_value = mock_response

    with patch("httpx.AsyncClient", return_value=mock_client_instance):
        with pytest.raises(OllamaResponseError) as exc_info:
            await client.generate(prompt="Hi")
        assert "response is not valid JSON" in str(exc_info.value)


@pytest.mark.asyncio
async def test_generate_missing_message_key():
    client = OllamaClient(base_url="http://localhost:11434", model="llama3.2:3b")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {"model": "llama3.2:3b"}  # missing "message"

    mock_client_instance = AsyncMock(spec=httpx.AsyncClient)
    mock_client_instance.__aenter__.return_value = mock_client_instance
    mock_client_instance.post.return_value = mock_response

    with patch("httpx.AsyncClient", return_value=mock_client_instance):
        with pytest.raises(OllamaEmptyResponseError) as exc_info:
            await client.generate(prompt="Hi")
        assert "missing the 'message' object" in str(exc_info.value)


@pytest.mark.asyncio
async def test_generate_missing_content_key():
    client = OllamaClient(base_url="http://localhost:11434", model="llama3.2:3b")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "model": "llama3.2:3b",
        "message": {"role": "assistant"},  # missing "content"
    }

    mock_client_instance = AsyncMock(spec=httpx.AsyncClient)
    mock_client_instance.__aenter__.return_value = mock_client_instance
    mock_client_instance.post.return_value = mock_response

    with patch("httpx.AsyncClient", return_value=mock_client_instance):
        with pytest.raises(OllamaEmptyResponseError) as exc_info:
            await client.generate(prompt="Hi")
        assert "missing 'content'" in str(exc_info.value)


@pytest.mark.asyncio
async def test_generate_empty_content():
    client = OllamaClient(base_url="http://localhost:11434", model="llama3.2:3b")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "model": "llama3.2:3b",
        "message": {"role": "assistant", "content": "   "},  # whitespace content
    }

    mock_client_instance = AsyncMock(spec=httpx.AsyncClient)
    mock_client_instance.__aenter__.return_value = mock_client_instance
    mock_client_instance.post.return_value = mock_response

    with patch("httpx.AsyncClient", return_value=mock_client_instance):
        with pytest.raises(OllamaEmptyResponseError) as exc_info:
            await client.generate(prompt="Hi")
        assert "empty response content" in str(exc_info.value)


@pytest.mark.asyncio
async def test_check_health_success():
    client = OllamaClient(base_url="http://localhost:11434")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200

    mock_client_instance = AsyncMock(spec=httpx.AsyncClient)
    mock_client_instance.__aenter__.return_value = mock_client_instance
    mock_client_instance.get.return_value = mock_response

    with patch("httpx.AsyncClient", return_value=mock_client_instance):
        result = await client.check_health()
        assert result is True
        mock_client_instance.get.assert_called_once_with("http://localhost:11434/api/tags")


@pytest.mark.asyncio
async def test_check_health_failure_status():
    client = OllamaClient(base_url="http://localhost:11434")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 500

    mock_client_instance = AsyncMock(spec=httpx.AsyncClient)
    mock_client_instance.__aenter__.return_value = mock_client_instance
    mock_client_instance.get.return_value = mock_response

    with patch("httpx.AsyncClient", return_value=mock_client_instance):
        result = await client.check_health()
        assert result is False


@pytest.mark.asyncio
async def test_check_health_failure_exception():
    client = OllamaClient(base_url="http://localhost:11434")

    mock_client_instance = AsyncMock(spec=httpx.AsyncClient)
    mock_client_instance.__aenter__.return_value = mock_client_instance
    mock_client_instance.get.side_effect = httpx.ConnectError("Connection refused")

    with patch("httpx.AsyncClient", return_value=mock_client_instance):
        result = await client.check_health()
        assert result is False
