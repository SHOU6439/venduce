from __future__ import annotations


from sqlalchemy import String, Text, Integer, BigInteger, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from ulid import ULID
from datetime import datetime

from app.db.database import Base


class Asset(Base):
    """アップロード済みファイルを表す永続化エンティティ。

    Attributes:
        owner_id: このアセットをアップロードしたユーザーID。
        purpose: 利用目的（avatar / post_image などの列挙値）。
        status: 処理状態（pending や ready）。
        storage_key: ストレージ内の保存パス。
        content_type: ファイルの MIME タイプ。
        extension: 拡張子情報。
        size_bytes: バイト単位のファイルサイズ。
        width: 画像の横幅（存在する場合）。
        height: 画像の縦幅（存在する場合）。
        checksum: 重複検出／整合性確認用ハッシュ。
        variants: 生成済みバリアント（サムネイルなど）のメタ情報。
        public_url: クライアントに返せる公開 URL。
        extra_metadata: 任意の補足メタデータ。
    """
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(26), primary_key=True, default=lambda: str(ULID()), nullable=False)

    owner_id: Mapped[str] = mapped_column(String(26), nullable=False, index=True)
    purpose: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending", index=True)

    storage_key: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    extension: Mapped[str] = mapped_column(String(10), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    checksum: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    variants: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)
    public_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    extra_metadata: Mapped[dict | list | None] = mapped_column("metadata", JSONB, nullable=True)

    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


__all__ = ["Asset"]
