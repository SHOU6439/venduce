from __future__ import annotations

from pathlib import Path
from typing import IO, Any

from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.services.storage import storage_client, build_asset_path
from ulid import ULID


class AssetService:
    def __init__(self, storage=storage_client):
        self.storage = storage

    def create_asset(
        self,
        db: Session,
        *,
        owner_id: str,
        owner_type: str,
        purpose: str,
        filename: str,
        content_type: str,
        fileobj: IO[bytes],
        size_bytes: int,
        width: int | None = None,
        height: int | None = None,
        checksum: str | None = None,
        variants: dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Asset:
        asset_id = str(ULID())
        asset = Asset(
            id=asset_id,
            owner_id=owner_id,
            owner_type=owner_type,
            purpose=purpose,
            status="processing",
            content_type=content_type,
            extension=Path(filename).suffix.lstrip(".") or "bin",
            size_bytes=size_bytes,
            width=width,
            height=height,
            checksum=checksum,
            variants=variants,
            extra_metadata=metadata,
        )
        db.add(asset)
        relative_path = build_asset_path(
            purpose=purpose,
            owner_type=owner_type,
            owner_id=owner_id,
            asset_id=asset_id,
            variant="original",
            extension=asset.extension,
        )
        fileobj.seek(0)
        self.storage.save(fileobj, relative_path)
        asset.storage_key = relative_path
        asset.public_url = self.storage.generate_url(relative_path)
        asset.status = "ready"
        db.commit()
        db.refresh(asset)
        return asset


asset_service = AssetService()

__all__ = ["AssetService", "asset_service"]
