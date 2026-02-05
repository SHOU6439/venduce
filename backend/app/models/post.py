from __future__ import annotations
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy import String, Text, DateTime, func, ForeignKey, Enum, Integer
from app.models.enums import PostStatus
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from ulid import ULID

from app.db.database import Base
from app.models.post_products import post_products
from app.models.post_tags import post_tags
from app.models.post_assets import post_assets


class Post(Base):
    """投稿モデル

    Fields:
        id: ULID
        user_id: 投稿者
        caption: キャプション（本文）
        status: public/archived/draft
        purchase_count: 投稿経由の購入数（集計用）
    """
    __tablename__ = "posts"

    id: Mapped[str] = mapped_column(String(26), primary_key=True, default=lambda: str(ULID()), index=True)
    user_id: Mapped[str] = mapped_column(String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    caption: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[PostStatus] = mapped_column(
        Enum(
            PostStatus,
            name="post_status",
            values_callable=lambda x: [e.value for e in x]
        ),
        default=PostStatus.PUBLIC,
        index=True,
        nullable=False
    )

    purchase_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    like_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    extra_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column("metadata", JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user = relationship("User", backref="posts")

    products = relationship("Product", secondary=post_products, backref="posts")
    tags = relationship("Tag", secondary=post_tags, backref="posts")

    assets = relationship("Asset", secondary=post_assets, backref="posts", overlaps="asset")


__all__ = ["Post"]
