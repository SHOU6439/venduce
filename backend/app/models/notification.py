from __future__ import annotations

from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Text, func, Enum as SAEnum
from sqlalchemy.orm import relationship, Mapped, mapped_column
from ulid import ULID

from app.db.database import Base
from app.models.enums import NotificationType


class Notification(Base):
    """ユーザーへの通知を表すモデル。

    Attributes:
        id: ULID ベースの主キー
        user_id: 通知を受け取るユーザー
        actor_id: 通知を引き起こしたユーザー
        type: 通知の種類 (like / follow / comment / purchase / ranking)
        entity_id: 関連エンティティの ID (post_id, comment_id 等)
        message: 通知メッセージ本文
        is_read: 既読フラグ
        created_at: 作成日時
    """
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(
        String(26), primary_key=True, default=lambda: str(ULID()), index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_id: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    type: Mapped[str] = mapped_column(
        SAEnum(NotificationType, name="notification_type", create_constraint=False),
        nullable=False,
        index=True,
    )
    entity_id: Mapped[str | None] = mapped_column(
        String(26), nullable=True,
    )
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="notifications")
    actor = relationship("User", foreign_keys=[actor_id])


__all__ = ["Notification"]
