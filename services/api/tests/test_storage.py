from __future__ import annotations

import pytest

from app.core.config import Settings
from app.storage import DocumentStorage


@pytest.mark.asyncio
async def test_local_storage_round_trip(tmp_path):
    settings = Settings(
        _env_file=None,
        STORAGE_BACKEND="local",
        UPLOAD_DIRECTORY=str(tmp_path),
    )
    storage = DocumentStorage(settings)

    stored_path = await storage.put(
        "subjects/subject-id/notes.pdf",
        b"%PDF-test",
        "application/pdf",
    )

    assert await storage.get(stored_path) == b"%PDF-test"
    await storage.delete(stored_path)
    assert not (tmp_path / "subjects" / "subject-id" / "notes.pdf").exists()


def test_supabase_storage_uses_private_object_api():
    settings = Settings(
        _env_file=None,
        STORAGE_BACKEND="supabase",
        SUPABASE_URL="https://project.supabase.co/",
        SUPABASE_SECRET_KEY="sb_secret_server-only-secret",
        SUPABASE_STORAGE_BUCKET="documents",
    )
    storage = DocumentStorage(settings)

    assert storage._object_url("subjects/a file.pdf") == (
        "https://project.supabase.co/storage/v1/object/documents/subjects/a%20file.pdf"
    )
