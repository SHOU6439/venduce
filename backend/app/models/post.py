from __future__ import annotations

from sqlalchemy import Column, String, Text, DateTime, func, ForeignKey, Enum, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from ulid import ULID

from app.db.database import Base
from app.models.post_products import post_products
from app.models.post_tags import post_tags


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

    id = Column(String(26), primary_key=True, default=lambda: str(ULID()), index=True)
    user_id = Column(String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    caption = Column(Text, nullable=True)
    status = Column(String(16), default="public", index=True, nullable=False)

    purchase_count = Column(Integer, default=0, nullable=False)
    view_count = Column(Integer, default=0, nullable=False)
    like_count = Column(Integer, default=0, nullable=False)

    extra_metadata = Column("metadata", JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user = relationship("User", backref="posts")

    products = relationship("Product", secondary=post_products, backref="posts")
    tags = relationship("Tag", secondary=post_tags, backref="posts")

    # Asset とのリレーション (1:N)
    # Asset.post_id を外部キーとして紐付ける
    assets = relationship("Asset", backref="post", lazy="joined")


__all__ = ["Post"]
