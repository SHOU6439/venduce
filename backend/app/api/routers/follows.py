from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.models.user import User
from app.schemas.user import PublicUserRead
from app.schemas.asset import AssetRead
from app.schemas.post import PostRead
from app.schemas.pagination import PaginatedResponse, CursorMeta
from app.db.database import get_db
from app.deps import get_current_user, get_current_user_optional, get_follow_service, get_like_service, get_badge_service, get_notification_service
from app.services.follow_service import FollowService
from app.services.like_service import LikeService
from app.services.badge_service import BadgeService
from app.services.notification_service import NotificationService
from app.models.enums import BadgeCategory, NotificationType


router = APIRouter(prefix="/api/follows", tags=["follows"])


class FollowStatus(BaseModel):
    is_following: bool
    follower_count: int
    following_count: int


class FollowUserItem(BaseModel):
    id: str
    username: str
    bio: str | None = None
    avatar_url: str | None = None
    is_following: bool = False


# --- フォローフィード (/{user_id} より先に定義) ---


@router.get("/feed/timeline", response_model=PaginatedResponse[PostRead])
def get_follow_feed(
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    follow_service: FollowService = Depends(get_follow_service),
    like_service: LikeService = Depends(get_like_service),
) -> PaginatedResponse[PostRead]:
    """フォロー中のユーザーの投稿をタイムライン順で返します。"""
    posts, next_cursor, has_more = follow_service.get_following_feed(
        user_id=current_user.id, limit=limit, cursor=cursor
    )
    liked_ids = like_service.get_liked_post_ids_for_user(
        current_user.id, [p.id for p in posts]
    ) if posts else set()
    items = [
        PostRead.model_validate(p).model_copy(update={"is_liked": p.id in liked_ids})
        for p in posts
    ]
    return PaginatedResponse(
        items=items,
        meta=CursorMeta(next_cursor=next_cursor, has_more=has_more, returned=len(items)),
    )


# --- フォロー / アンフォロー ---


@router.post("/{user_id}")
def follow_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    follow_service: FollowService = Depends(get_follow_service),
    badge_service: BadgeService = Depends(get_badge_service),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """指定ユーザーをフォローします。"""
    created = follow_service.follow(
        follower_id=current_user.id, following_id=user_id
    )
    if not created:
        return {"detail": "既にフォローしています"}

    # フォロワー数バッジ（フォローされた側）と初フォローバッジ（自分）の自動判定
    try:
        badge_service.ensure_default_badges()
        badge_service.evaluate_and_award(
            user_id,
            categories=[BadgeCategory.FOLLOWERS],
        )
        badge_service.evaluate_and_award(
            current_user.id,
            categories=[BadgeCategory.FIRST_ACTION],
        )
    except Exception:
        pass

    # フォロー対象に「フォローされました」通知を送信
    try:
        notification_service.create_notification(
            user_id=user_id,
            actor_id=current_user.id,
            notification_type=NotificationType.FOLLOW,
            entity_id=current_user.id,
            message=f"{current_user.username} があなたをフォローしました",
        )
    except Exception:
        pass

    return {"detail": "フォローしました"}


@router.delete("/{user_id}")
def unfollow_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    follow_service: FollowService = Depends(get_follow_service),
):
    """指定ユーザーのフォローを解除します。"""
    removed = follow_service.unfollow(
        follower_id=current_user.id, following_id=user_id
    )
    if not removed:
        return {"detail": "フォローしていません"}
    return {"detail": "フォロー解除しました"}


# --- フォロー状態 ---


@router.get("/{user_id}/status", response_model=FollowStatus)
def get_follow_status(
    user_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    follow_service: FollowService = Depends(get_follow_service),
) -> FollowStatus:
    """指定ユーザーのフォロー状態・フォロワー数・フォロー数を返します。"""
    is_following = False
    if current_user:
        is_following = follow_service.is_following(
            follower_id=current_user.id, following_id=user_id
        )
    return FollowStatus(
        is_following=is_following,
        follower_count=follow_service.get_follower_count(user_id),
        following_count=follow_service.get_following_count(user_id),
    )


# --- フォロワー一覧 ---


@router.get("/{user_id}/followers", response_model=PaginatedResponse[FollowUserItem])
def get_followers(
    user_id: str,
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user_optional),
    follow_service: FollowService = Depends(get_follow_service),
) -> PaginatedResponse[FollowUserItem]:
    """指定ユーザーのフォロワー一覧を返します。"""
    users, next_cursor, has_more = follow_service.get_followers(
        user_id=user_id, limit=limit, cursor=cursor
    )
    # 自分がフォローしているか判定
    following_ids: set[str] = set()
    if current_user and users:
        for u in users:
            if follow_service.is_following(current_user.id, u.id):
                following_ids.add(u.id)

    items = []
    for u in users:
        avatar_url = None
        if hasattr(u, "avatar_asset") and u.avatar_asset:
            avatar_url = u.avatar_asset.public_url
        items.append(FollowUserItem(
            id=u.id,
            username=u.username,
            bio=u.bio,
            avatar_url=avatar_url,
            is_following=u.id in following_ids,
        ))
    return PaginatedResponse(
        items=items,
        meta=CursorMeta(next_cursor=next_cursor, has_more=has_more, returned=len(items)),
    )


# --- フォロー中一覧 ---


@router.get("/{user_id}/following", response_model=PaginatedResponse[FollowUserItem])
def get_following(
    user_id: str,
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user_optional),
    follow_service: FollowService = Depends(get_follow_service),
) -> PaginatedResponse[FollowUserItem]:
    """指定ユーザーがフォロー中のユーザー一覧を返します。"""
    users, next_cursor, has_more = follow_service.get_following(
        user_id=user_id, limit=limit, cursor=cursor
    )
    following_ids: set[str] = set()
    if current_user and users:
        for u in users:
            if follow_service.is_following(current_user.id, u.id):
                following_ids.add(u.id)

    items = []
    for u in users:
        avatar_url = None
        if hasattr(u, "avatar_asset") and u.avatar_asset:
            avatar_url = u.avatar_asset.public_url
        items.append(FollowUserItem(
            id=u.id,
            username=u.username,
            bio=u.bio,
            avatar_url=avatar_url,
            is_following=u.id in following_ids,
        ))
    return PaginatedResponse(
        items=items,
        meta=CursorMeta(next_cursor=next_cursor, has_more=has_more, returned=len(items)),
    )
