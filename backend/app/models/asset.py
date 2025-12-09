from __future__ import annotations

from sqlalchemy import Column, String, Text, Integer, BigInteger, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from ulid import ULID

from app.db.database import Base


class Asset(Base):
    """アップロード済みファイルを表す永続化エンティティ。

    Attributes:
        owner_id: このアセットの所有者ID（例: ユーザーID）。
        owner_type: 所有者の種別（user / product など）。
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

    id = Column(String(26), primary_key=True, default=lambda: str(ULID()), nullable=False)

    owner_id = Column(String(26), nullable=False, index=True)
    owner_type = Column(String(32), nullable=False, index=True)
    purpose = Column(String(32), nullable=False, index=True)
    status = Column(String(16), nullable=False, default="pending", index=True)

    storage_key = Column(Text, nullable=False, unique=True)
    content_type = Column(String(100), nullable=False)
    extension = Column(String(10), nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    checksum = Column(String(64), nullable=True, index=True)

    variants = Column(JSONB, nullable=True)
    public_url = Column(Text, nullable=True)
    extra_metadata = Column("metadata", JSONB, nullable=True)

    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)

__all__ = ["Asset"]
