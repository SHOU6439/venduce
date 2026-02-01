from __future__ import annotations
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship, Mapped, mapped_column
from ulid import ULID

from app.db.database import Base


class Like(Base):
    """投稿へのいいねを表すモデル

    Attributes:
        id: ULID
        user_id: いいねしたユーザー
        post_id: いいねされた投稿
        created_at: いいね日時
    """
    __tablename__ = "likes"

    id: Mapped[str] = mapped_column(String(26), primary_key=True, default=lambda: str(ULID()), index=True)
    user_id: Mapped[str] = mapped_column(String(26), ForeignKey(
        "users.id", ondelete="CASCADE"
    ), nullable=False, index=True)
    post_id: Mapped[str] = mapped_column(String(26), ForeignKey(
        "posts.id", ondelete="CASCADE"
    ), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", backref="likes")
    post = relationship("Post", backref="likes")

    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="uq_user_post_like"),
    )


__all__ = ["Like"]
