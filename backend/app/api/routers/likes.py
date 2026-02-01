from fastapi import APIRouter, Depends, status, Response

from app.deps import get_current_user, get_like_service
from app.models.user import User
from app.services.like_service import LikeService


router = APIRouter(tags=["likes"])


@router.post(
    "/api/posts/{post_id}/likes",
    status_code=status.HTTP_201_CREATED,
    summary="いいねを作成",
    description="指定した投稿にいいねを追加します。既に存在する場合は変更せず成功(204)とします。"
)
def create_like(
    post_id: str,
    response: Response,
    current_user: User = Depends(get_current_user),
    like_service: LikeService = Depends(get_like_service)
):
    is_created = like_service.create_like(user_id=current_user.id, post_id=post_id)
    if not is_created:
        response.status_code = status.HTTP_204_NO_CONTENT
    return None


@router.delete(
    "/api/posts/{post_id}/likes",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="いいねを削除",
    description="指定した投稿のいいねを取り消します。存在しない場合は何もしません。"
)
def delete_like(
    post_id: str,
    current_user: User = Depends(get_current_user),
    like_service: LikeService = Depends(get_like_service)
):
    like_service.delete_like(user_id=current_user.id, post_id=post_id)
