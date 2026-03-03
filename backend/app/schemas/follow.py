from __future__ import annotations

from typing import Optional

from app.schemas.base import AppModel


class FollowStatus(AppModel):
    is_following: bool
    follower_count: int
    following_count: int


class FollowUserItem(AppModel):
    id: str
    username: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_following: bool = False


__all__ = ["FollowStatus", "FollowUserItem"]
