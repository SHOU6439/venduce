from __future__ import annotations

import shutil
from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO

from app.core.config import settings


class StorageClient(ABC):
    """抽象ストレージクライアント。"""

    @abstractmethod
    def save(self, source: BinaryIO, relative_path: str) -> str:
        """ファイルを保存し、保存先の相対パスを返す。"""

    @abstractmethod
    def delete(self, relative_path: str) -> None:
        """指定パスを削除する（存在しない場合は無視）。"""

    @abstractmethod
    def generate_url(self, relative_path: str) -> str:
        """公開 URL を返す（公開不要の場合はパスをそのまま返す）。"""

    @abstractmethod
    def absolute_path(self, relative_path: str) -> Path:
        """保存先ルートからの絶対パスを返す。"""


class LocalStorageClient(StorageClient):
    """ローカルディスクに保存するシンプルな実装。"""

    def __init__(self, root: str | Path, public_base_url: str | None = None) -> None:
        self.root = Path(root).expanduser().resolve()
        self.public_base_url = (public_base_url or "").rstrip("/")
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, source: BinaryIO, relative_path: str) -> str:
        destination = self.absolute_path(relative_path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open("wb") as f:
            shutil.copyfileobj(source, f, length=1024 * 1024)
        return relative_path

    def delete(self, relative_path: str) -> None:
        path = self.absolute_path(relative_path)
        try:
            path.unlink()
        except FileNotFoundError:
            pass

    def generate_url(self, relative_path: str) -> str:
        if not self.public_base_url:
            return relative_path
        rel = relative_path.lstrip("/")
        return f"{self.public_base_url}/{rel}" if self.public_base_url else rel

    def absolute_path(self, relative_path: str) -> Path:
        rel = Path(relative_path.lstrip("/"))
        return self.root / rel


def sanitize_segment(segment: str | None) -> str:
    """ストレージパスに使えるよう、区切り文字を除外する。"""
    segment = segment or ""
    sanitized = segment.strip().replace("../", "").replace("..", "")
    sanitized = sanitized.replace("/", "_").replace("\\", "_")
    return sanitized or "unknown"


def build_asset_path(
    *,
    purpose: str,
    owner_type: str,
    owner_id: str,
    asset_id: str,
    variant: str = "original",
    extension: str = "bin",
) -> str:
    """保存用の相対パスを生成する。"""
    safe_extension = extension.lower().lstrip(".") or "bin"
    segments = [purpose, owner_type, owner_id, asset_id]
    safe_segments = [sanitize_segment(seg) for seg in segments]
    safe_variant = sanitize_segment(variant) or "original"
    return "/".join(safe_segments + [f"{safe_variant}.{safe_extension}"])


storage_client = LocalStorageClient(
    root=settings.ASSET_STORAGE_ROOT,
    public_base_url=settings.ASSET_PUBLIC_BASE_URL,
)


__all__ = [
    "StorageClient",
    "LocalStorageClient",
    "storage_client",
    "build_asset_path",
    "sanitize_segment",
]
