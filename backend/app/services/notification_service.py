"""通知サービス。

通知の作成・取得・既読管理とリアルタイム WebSocket プッシュを担う。
"""
from __future__ import annotations

from typing import List, Optional, Tuple

from sqlalchemy import select, update, func
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.enums import NotificationType
from app.core.ws_manager import fire_and_forget_send_to_user
from app.utils.cursor import encode_cursor, decode_cursor


class NotificationService:
    """インスタンスベースのサービス (db をコンストラクタで受け取る)。"""

    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # 作成
    # ------------------------------------------------------------------

    def create_notification(
        self,
        *,
        user_id: str,
        actor_id: Optional[str],
        notification_type: NotificationType,
        entity_id: Optional[str] = None,
        message: Optional[str] = None,
        push: bool = True,
    ) -> Notification:
        """通知レコードを作成し、オプションで WebSocket プッシュする。

        自分自身への通知 (user_id == actor_id) は作成しない。
        """
        if actor_id and user_id == actor_id:
            return None  # type: ignore[return-value]

        notification = Notification(
            user_id=user_id,
            actor_id=actor_id,
            type=notification_type,
            entity_id=entity_id,
            message=message,
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)

        if push:
            self._push_to_user(notification)

        return notification

    # ------------------------------------------------------------------
    # 取得
    # ------------------------------------------------------------------

    def get_notifications(
        self,
        user_id: str,
        *,
        limit: int = 20,
        cursor: Optional[str] = None,
        unread_only: bool = False,
    ) -> Tuple[List[Notification], Optional[str], bool]:
        """ユーザーの通知一覧をカーソルベースページネーションで返す。"""
        query = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
        )

        if unread_only:
            query = query.where(Notification.is_read.is_(False))

        if cursor:
            cursor_created_at, cursor_id = decode_cursor(cursor)
            query = query.where(
                (Notification.created_at < cursor_created_at)
                | (
                    (Notification.created_at == cursor_created_at)
                    & (Notification.id < cursor_id)
                )
            )

        rows = self.db.execute(query.limit(limit + 1)).scalars().all()

        has_more = len(rows) > limit
        if has_more:
            rows = list(rows[:limit])

        next_cursor: Optional[str] = None
        if has_more and rows:
            last = rows[-1]
            next_cursor = encode_cursor(last.created_at, last.id)

        return list(rows), next_cursor, has_more

    def get_unread_count(self, user_id: str) -> int:
        """未読通知数を返す。"""
        result = self.db.execute(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.is_read.is_(False))
        ).scalar()
        return result or 0

    # ------------------------------------------------------------------
    # 既読
    # ------------------------------------------------------------------

    def mark_as_read(
        self,
        user_id: str,
        notification_ids: Optional[List[str]] = None,
    ) -> int:
        """通知を既読にする。notification_ids が None の場合は全件既読。

        Returns:
            更新された件数
        """
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read.is_(False))
        )
        if notification_ids:
            stmt = stmt.where(Notification.id.in_(notification_ids))

        stmt = stmt.values(is_read=True)
        result = self.db.execute(stmt)
        self.db.commit()
        return result.rowcount  # type: ignore[return-value]

    # ------------------------------------------------------------------
    # WebSocket プッシュ
    # ------------------------------------------------------------------

    @staticmethod
    def _push_to_user(notification: Notification) -> None:
        """WebSocket 経由でリアルタイム通知を配信する。"""
        payload = {
            "id": notification.id,
            "type": notification.type if isinstance(notification.type, str) else notification.type.value,
            "actor_id": notification.actor_id,
            "entity_id": notification.entity_id,
            "message": notification.message,
            "is_read": notification.is_read,
            "created_at": notification.created_at.isoformat() if notification.created_at else None,
        }
        fire_and_forget_send_to_user(notification.user_id, "notification", payload)


__all__ = ["NotificationService"]
