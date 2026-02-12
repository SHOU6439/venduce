from __future__ import annotations

from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from ulid import ULID

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.post import Post


class Comment(Base):
    """投稿へのコメントモデル

    Attributes:
        id: ULID
        post_id: 紐づく投稿ID
        user_id: コメント投稿者ID
        content: コメント本文
        parent_comment_id: 返信先のコメントID（ルートコメントの場合はNULL）
    """
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(String(26), primary_key=True, default=lambda: str(ULID()), index=True)
    post_id: Mapped[str] = mapped_column(String(26), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    parent_comment_id: Mapped[Optional[str]] = mapped_column(String(26), ForeignKey("comments.id", ondelete="CASCADE"), nullable=True, index=True)
    is_deleted: Mapped[bool] = mapped_column(server_default="false", default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user: Mapped["User"] = relationship("User", backref="comments")
    post: Mapped["Post"] = relationship("Post", backref="comments")

    parent_comment: Mapped[Optional["Comment"]] = relationship("Comment", remote_side=[id], back_populates="replies")
    replies: Mapped[List["Comment"]] = relationship("Comment", back_populates="parent_comment", cascade="all, delete-orphan")

    @property
    def active_replies(self) -> List["Comment"]:
        """削除されていない返信のみを返す"""
        return [reply for reply in self.replies if not reply.is_deleted]

    def __repr__(self):
        return f"<Comment id={self.id} post_id={self.post_id} user_id={self.user_id}>"
