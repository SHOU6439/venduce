from __future__ import annotations

from ulid import ULID
from sqlalchemy import Column, String, Text, Integer, DateTime, func, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from app.db.database import Base


class Brand(Base):
    """ブランドモデル（商品ブランド情報）

    Atributes:
    - id: ULID を文字列で保持する一意の主キー。
    - name: ブランド名（UI 表示用）。
    - slug: URL や参照に使う短縮識別子（小文字化・ハイフン化して一意にする）。
    - description: ブランド説明（任意）。
    - is_active: 公開フラグ（False の場合は公開 API から除外）。
    - image_asset_id: 画像を参照する `assets.id`（Asset レコードを参照する FK）。
    - metadata (extra_metadata): 拡張メタ情報を JSONB で保持。
    - created_at / updated_at: 作成・更新時刻。

    """

    __tablename__ = "brands"

    id = Column(String(26), primary_key=True, index=True, default=lambda: str(ULID()))
    name = Column(String(255), nullable=False)
    slug = Column(String(128), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    image_asset_id = Column(String(26), ForeignKey("assets.id"), nullable=True, index=True)
    extra_metadata = Column("metadata", JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


__all__ = ["Brand"]
