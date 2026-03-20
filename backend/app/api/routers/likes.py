from fastapi import APIRouter, Depends, status, Response, Query
from typing import Optional

from app.deps import get_current_user, get_like_service, get_badge_service, get_notification_service
from app.models.user import User
from app.services.like_service import LikeService
from app.services.badge_service import BadgeService
from app.services.notification_service import NotificationService
from app.models.enums import BadgeCategory, NotificationType
from app.schemas.post import PostRead
from app.schemas.pagination import PaginatedResponse, CursorMeta
from app.db.database import get_db
from app.models.post import Post
from app.core.ws_manager import fire_and_forget_broadcast
from sqlalchemy.orm import Session


router = APIRouter(tags=["likes"])


@router.get(
    "/api/users/me/likes",
    response_model=PaginatedResponse[PostRead],
    summary="自分がいいねした投稿一覧",
    description="ログイン中のユーザーがいいねした投稿を新しい順で返します。"
)
def get_my_liked_posts(
    cursor: Optional[str] = Query(default=None, description="Cursor for pagination"),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    like_service: LikeService = Depends(get_like_service),
):
    posts, next_cursor, has_more = like_service.get_liked_posts_by_user(
        user_id=current_user.id,
        limit=limit,
        cursor=cursor,
    )

    items = [
        PostRead.model_validate(p).model_copy(update={"is_liked": True})
        for p in posts
    ]
    return PaginatedResponse(
        items=items,
        meta=CursorMeta(next_cursor=next_cursor, has_more=has_more, returned=len(items)),
    )


@router.post(
    "/api/posts/{post_id}/likes",
    status_code=status.HTTP_201_CREATED,
    response_model=None,
    summary="いいねを作成",
    description="指定した投稿にいいねを追加します。既に存在する場合は変更せず成功(204)とします。"
)
def create_like(
    post_id: str,
    response: Response,
    current_user: User = Depends(get_current_user),
    like_service: LikeService = Depends(get_like_service),
    badge_service: BadgeService = Depends(get_badge_service),
    notification_service: NotificationService = Depends(get_notification_service),
    db: Session = Depends(get_db),
):
    is_created = like_service.create_like(user_id=current_user.id, post_id=post_id)
    if not is_created:
        response.status_code = status.HTTP_204_NO_CONTENT
        return

    # いいね獲得バッジ（投稿主）と初いいねバッジ（自分）の自動判定
    try:
        badge_service.ensure_default_badges()
        # 投稿主のいいね獲得バッジ
        post = db.query(Post).filter(Post.id == post_id).first()
        if post and post.user_id != current_user.id:
            badge_service.evaluate_and_award(
                post.user_id,
                categories=[BadgeCategory.LIKES_RECEIVED],
            )
        # 自分の初いいねバッジ
        badge_service.evaluate_and_award(
            current_user.id,
            categories=[BadgeCategory.FIRST_ACTION],
        )
    except Exception:
        pass

    # ランキングに影響するため全クライアントに通知
    fire_and_forget_broadcast("ranking_updated")

    # 投稿主に「いいねされました」通知を送信
    try:
        post = db.query(Post).filter(Post.id == post_id).first()
        if post and post.user_id != current_user.id:
            notification_service.create_notification(
                user_id=post.user_id,
                actor_id=current_user.id,
                notification_type=NotificationType.LIKE,
                entity_id=post_id,
                message=f"{current_user.username} があなたの投稿にいいねしました",
            )
    except Exception:
        pass


@router.delete(
    "/api/posts/{post_id}/likes",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="いいねを削除",
    description="指定した投稿のいいねを取り消します。存在しない場合は何もしません。"
)
def delete_like(
    post_id: str,
    current_user: User = Depends(get_current_user),
    like_service: LikeService = Depends(get_like_service)
):
    like_service.delete_like(user_id=current_user.id, post_id=post_id)
