"""通知関連のスキーマ定義。"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import ConfigDict, Field

from app.schemas.base import AppModel


class NotificationActorRead(AppModel):
    """通知のアクター（通知を引き起こしたユーザー）の簡易情報。"""
    id: str
    username: str
    avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationRead(AppModel):
    """通知のレスポンススキーマ。"""
    id: str
    user_id: str
    actor_id: Optional[str] = None
    actor: Optional[NotificationActorRead] = None
    type: str
    entity_id: Optional[str] = None
    message: Optional[str] = None
    is_read: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationMarkReadRequest(AppModel):
    """既読にする通知 ID のリスト。空の場合は全件既読。"""
    notification_ids: Optional[list[str]] = Field(
        default=None,
        description="既読にする通知 ID のリスト。省略または null の場合は全件既読にする。",
    )


class UnreadCountResponse(AppModel):
    """未読通知数のレスポンス。"""
    count: int


__all__ = [
    "NotificationActorRead",
    "NotificationRead",
    "NotificationMarkReadRequest",
    "UnreadCountResponse",
]
