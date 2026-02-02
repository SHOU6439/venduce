from typing import Optional
from fastapi import APIRouter, Depends, status, Query

from app.deps import get_current_user, get_post_service, get_current_user_optional
from app.models.user import User
from app.schemas.post import PostCreate, PostRead
from app.schemas.pagination import PaginatedResponse, CursorMeta
from app.services.post_service import PostService

router = APIRouter(prefix="/api/posts", tags=["posts"])


@router.get("", response_model=PaginatedResponse[PostRead])
def get_posts(
    cursor: Optional[str] = Query(default=None, description="Cursor for pagination"),
    limit: int = Query(default=20, ge=1, le=100, description="Number of items to return"),
    q: Optional[str] = Query(default=None, description="Search query"),
    post_service: PostService = Depends(get_post_service),
):
    """公開投稿の一覧を取得します（cursor ベースのページネーション、検索対応）。

    - **cursor**: 継続取得用のカーソル
    - **limit**: 取得件数（1-100、デフォルト: 20）
    - **q**: 検索クエリ（キャプションで検索）

    Returns:
        PaginatedResponse[PostRead]: 投稿リストとページネーション情報
    """
    if q:
        # 検索モード
        posts = post_service.search_posts(query=q, limit=limit)
        return PaginatedResponse(
            items=[PostRead.model_validate(p) for p in posts],
            meta=CursorMeta(
                next_cursor=None,
                has_more=False,
                returned=len(posts)
            )
        )
    
    # 通常モード（ページネーション）
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


@router.get("/{id}", response_model=PostRead)
def get_post_detail(
    id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    post_service: PostService = Depends(get_post_service),
):
    """投稿の詳細を取得します。

    - 公開投稿は誰でも閲覧可能
    - 下書き・アーカイブ投稿は投稿者本人のみ閲覧可能
    - is_liked フィールドは現在のユーザーがいいねしているかを表す（未実装の場合は false）

    Args:
        id: 投稿 ID
        current_user: 現在のユーザー（認証済みの場合、オプショナル）
        post_service: 投稿サービス

    Returns:
        PostRead: 投稿詳細（user, assets, products, tags, is_liked を含む）

    Raises:
        HTTPException: 404（投稿が存在しない）、403（アクセス権限がない）
    """
    return PostRead.model_validate(
        post_service.get_post_by_id(post_id=id, current_user=current_user)
    )
