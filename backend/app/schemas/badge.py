from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import ConfigDict

from app.schemas.base import AppModel


class BadgeRead(AppModel):
    id: str
    slug: str
    name: str
    description: str
    icon: str
    color: str
    threshold: int
    sort_order: int
    category: str

    model_config = ConfigDict(from_attributes=True)


class UserBadgeRead(AppModel):
    badge: BadgeRead
    awarded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NewBadgeNotification(AppModel):
    """未通知バッジ一覧（フロントエンドのエフェクト用）。"""
    badges: List[BadgeRead]


__all__ = ["BadgeRead", "UserBadgeRead", "NewBadgeNotification"]
