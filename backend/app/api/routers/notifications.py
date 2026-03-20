"""通知 API ルーター。

GET /api/notifications            — 通知一覧 (カーソルページネーション)
GET /api/notifications/unread-count — 未読数
POST /api/notifications/read       — 既読処理
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload

from app.db.database import get_db
from app.deps import get_current_user, get_notification_service
from app.models.user import User
from app.models.notification import Notification
from app.services.notification_service import NotificationService
from app.schemas.notification import (
    NotificationRead,
    NotificationActorRead,
    NotificationMarkReadRequest,
    UnreadCountResponse,
)
from app.schemas.pagination import PaginatedResponse, CursorMeta

router = APIRouter(redirect_slashes=False)


def _to_read(n: Notification) -> NotificationRead:
    """Notification ORM → NotificationRead レスポンスに変換。"""
    actor_data = None
    if n.actor:
        avatar_url = None
        if hasattr(n.actor, "avatar_asset") and n.actor.avatar_asset:
            avatar_url = n.actor.avatar_asset.public_url
        actor_data = NotificationActorRead(
            id=n.actor.id,
            username=n.actor.username,
            avatar_url=avatar_url,
        )
    return NotificationRead(
        id=n.id,
        user_id=n.user_id,
        actor_id=n.actor_id,
        actor=actor_data,
        type=n.type if isinstance(n.type, str) else n.type.value,
        entity_id=n.entity_id,
        message=n.message,
        is_read=n.is_read,
        created_at=n.created_at,
    )


@router.get(
    "",
    response_model=PaginatedResponse[NotificationRead],
    summary="通知一覧取得",
    description="カーソルベースのページネーションで通知を取得します。",
)
def list_notifications(
    cursor: Optional[str] = Query(default=None, description="Cursor for pagination"),
    limit: int = Query(default=20, ge=1, le=100),
    unread_only: bool = Query(default=False, description="未読のみ"),
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    notifications, next_cursor, has_more = service.get_notifications(
        current_user.id, limit=limit, cursor=cursor, unread_only=unread_only,
    )
    items = [_to_read(n) for n in notifications]
    return PaginatedResponse(
        items=items,
        meta=CursorMeta(next_cursor=next_cursor, has_more=has_more, returned=len(items)),
    )


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="未読通知数",
)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    count = service.get_unread_count(current_user.id)
    return UnreadCountResponse(count=count)


@router.post(
    "/read",
    summary="通知を既読にする",
    description="notification_ids を指定した場合はそれらのみ、省略時は全件既読にします。",
)
def mark_notifications_read(
    body: NotificationMarkReadRequest,
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    updated = service.mark_as_read(current_user.id, body.notification_ids)
    return {"updated": updated}
