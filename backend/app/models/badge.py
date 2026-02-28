from __future__ import annotations

from datetime import datetime
from ulid import ULID
from sqlalchemy import String, DateTime, Integer, func, ForeignKey, UniqueConstraint, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base
from app.models.enums import BadgeCategory


class Badge(Base):
    """バッジマスター定義。

    slug で一意に識別し、threshold で自動付与の閾値を管理する。
    """
    __tablename__ = "badges"

    id: Mapped[str] = mapped_column(
        String(26), primary_key=True, default=lambda: str(ULID()), index=True,
    )
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    category: Mapped[str] = mapped_column(
        SAEnum(
            BadgeCategory,
            name="badgecategory",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=BadgeCategory.DRIVEN_PURCHASES,
        index=True,
    )
    icon: Mapped[str] = mapped_column(String(50), nullable=False, default="trophy")
    color: Mapped[str] = mapped_column(String(30), nullable=False, default="#888888")
    threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    user_badges: Mapped[list["UserBadge"]] = relationship(
        "UserBadge", back_populates="badge", cascade="all, delete-orphan",
    )


class UserBadge(Base):
    """ユーザーが獲得したバッジの中間テーブル。"""
    __tablename__ = "user_badges"

    id: Mapped[str] = mapped_column(
        String(26), primary_key=True, default=lambda: str(ULID()), index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    badge_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("badges.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    notified: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    user = relationship("User", backref="user_badges")
    badge: Mapped["Badge"] = relationship("Badge", back_populates="user_badges")

    __table_args__ = (
        UniqueConstraint("user_id", "badge_id", name="uq_user_badge"),
    )
