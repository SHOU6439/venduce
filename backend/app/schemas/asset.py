from __future__ import annotations

from typing import Any

from pydantic import Field

from app.schemas.base import AppModel


class AssetRead(AppModel):
    id: str
    owner_id: str

    purpose: str
    status: str
    storage_key: str
    content_type: str
    extension: str
    size_bytes: int
    width: int | None = None
    height: int | None = None
    checksum: str | None = None
    public_url: str | None = None
    variants: dict[str, Any] | None = None
    metadata: dict[str, Any] | None = Field(default=None, alias="extra_metadata")


__all__ = ["AssetRead"]
