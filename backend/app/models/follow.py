from __future__ import annotations

from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship, Mapped, mapped_column
from ulid import ULID

from app.db.database import Base


class Follow(Base):
    """ユーザー間のフォロー関係を表すモデル。

    follower_id が following_id をフォローしている関係を表す。
    """
    __tablename__ = "follows"

    id: Mapped[str] = mapped_column(
        String(26), primary_key=True, default=lambda: str(ULID()), index=True
    )
    follower_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    following_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    follower = relationship("User", foreign_keys=[follower_id], backref="following_relations")
    following = relationship("User", foreign_keys=[following_id], backref="follower_relations")

    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_follower_following"),
    )


__all__ = ["Follow"]
