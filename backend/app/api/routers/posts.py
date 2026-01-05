from typing import Optional
from fastapi import APIRouter, Depends, status, Query

from app.deps import get_current_user, get_post_service
from app.models.user import User
from app.schemas.post import PostCreate, PostRead
from app.schemas.pagination import PaginatedResponse, CursorMeta
from app.services.post_service import PostService

router = APIRouter(prefix="/api/posts", tags=["posts"])


@router.get("", response_model=PaginatedResponse[PostRead])
def get_posts(
    cursor: Optional[str] = Query(default=None, description="Cursor for pagination"),
    limit: int = Query(default=20, ge=1, le=100, description="Number of items to return"),
    post_service: PostService = Depends(get_post_service),
):
    """公開投稿の一覧を取得します（cursor ベースのページネーション）。

    - **cursor**: 継続取得用のカーソル（前回のレスポンスの next_cursor を指定）
    - **limit**: 取得件数（1-100、デフォルト: 20）

    Returns:
        PaginatedResponse[PostRead]: 投稿リストとページネーション情報
    """
    posts, next_cursor, has_more = post_service.get_public_posts(
        cursor=cursor,
        limit=limit
    )

    return PaginatedResponse(
        items=[PostRead.model_validate(p) for p in posts],
        meta=CursorMeta(
            next_cursor=next_cursor,
            has_more=has_more,
            returned=len(posts)
        )
    )


@router.post("", response_model=PostRead, status_code=status.HTTP_201_CREATED)
def create_post(
    post_in: PostCreate,
    current_user: User = Depends(get_current_user),
    post_service: PostService = Depends(get_post_service),
):
    """投稿を作成します — バリデーションと永続化は PostService に委譲します。

    アセット／製品の検証、タグの正規化、DB へのコミットなどのビジネスルールは
    `PostService.create_post` に集約されており、ルーターは薄く保たれます。
    """
    post = post_service.create_post(post_in=post_in, current_user=current_user)
    return PostRead.model_validate(post)
