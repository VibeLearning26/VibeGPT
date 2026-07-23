"""Document storage backends shared by the API and processing worker."""

from __future__ import annotations

import asyncio
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote

import httpx

from app.core.config import Settings, get_settings


class DocumentStorage:
    """Store document bytes locally or in a private Supabase bucket."""

    def __init__(self, settings: Settings):
        self.settings = settings

    async def put(self, object_key: str, data: bytes, content_type: str) -> str:
        if self.settings.STORAGE_BACKEND == "local":
            path = self.settings.upload_path / object_key
            path.parent.mkdir(parents=True, exist_ok=True)
            await asyncio.to_thread(path.write_bytes, data)
            return str(path)

        response = await self._request(
            "POST",
            self._object_url(object_key),
            content=data,
            headers={"Content-Type": content_type, "x-upsert": "false"},
        )
        response.raise_for_status()
        return object_key

    async def get(self, stored_path: str) -> bytes:
        if self.settings.STORAGE_BACKEND == "local":
            path = Path(stored_path)
            if not path.is_file():
                raise FileNotFoundError(f"File not found: {stored_path}")
            return await asyncio.to_thread(path.read_bytes)

        response = await self._request("GET", self._object_url(stored_path))
        if response.status_code == 404:
            raise FileNotFoundError(f"Supabase object not found: {stored_path}")
        response.raise_for_status()
        return response.content

    async def delete(self, stored_path: str) -> None:
        if self.settings.STORAGE_BACKEND == "local":
            path = Path(stored_path)
            if path.exists():
                await asyncio.to_thread(path.unlink)
            return

        response = await self._request("DELETE", self._object_url(stored_path))
        if response.status_code not in (200, 204, 404):
            response.raise_for_status()

    def _object_url(self, object_key: str) -> str:
        base = self.settings.SUPABASE_URL.rstrip("/")
        bucket = quote(self.settings.SUPABASE_STORAGE_BUCKET, safe="")
        key = quote(object_key.lstrip("/"), safe="/")
        return f"{base}/storage/v1/object/{bucket}/{key}"

    async def _request(self, method: str, url: str, **kwargs) -> httpx.Response:
        key = self.settings.supabase_server_key
        headers = {"apikey": key, **kwargs.pop("headers", {})}
        # New sb_secret_* keys authenticate through the apikey header. Legacy
        # service_role JWTs are also sent as the bearer token.
        if not key.startswith("sb_secret_"):
            headers["Authorization"] = f"Bearer {key}"
        async with httpx.AsyncClient(timeout=60.0) as client:
            return await client.request(method, url, headers=headers, **kwargs)


@lru_cache
def get_document_storage() -> DocumentStorage:
    return DocumentStorage(get_settings())
