from typing import Optional
from fastapi import APIRouter, Depends, status, Query, Header

from app.deps import get_current_user, get_post_service, get_current_user_optional, get_like_service, get_badge_service
from app.models.user import User
from app.schemas.post import PostCreate, PostRead, PostUpdate
from app.schemas.pagination import PaginatedResponse, CursorMeta
from app.services.post_service import PostService
from app.services.like_service import LikeService
from app.services.badge_service import BadgeService
from app.models.enums import BadgeCategory

router = APIRouter(prefix="/api/posts", tags=["posts"])


@router.get("", response_model=PaginatedResponse[PostRead])
def get_posts(
    cursor: Optional[str] = Query(default=None, description="Cursor for pagination"),
    limit: int = Query(default=20, ge=1, le=100, description="Number of items to return"),
    q: Optional[str] = Query(default=None, description="Search query"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    post_service: PostService = Depends(get_post_service),
    like_service: LikeService = Depends(get_like_service),
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
        liked_ids = like_service.get_liked_post_ids_for_user(
            current_user.id, [p.id for p in posts]
        ) if current_user else set()
        return PaginatedResponse(
            items=[
                PostRead.model_validate(p).model_copy(update={"is_liked": p.id in liked_ids})
                for p in posts
            ],
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

    liked_ids = like_service.get_liked_post_ids_for_user(
        current_user.id, [p.id for p in posts]
    ) if current_user else set()

    return PaginatedResponse(
        items=[
            PostRead.model_validate(p).model_copy(update={"is_liked": p.id in liked_ids})
            for p in posts
        ],
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
    badge_service: BadgeService = Depends(get_badge_service),
):
    """投稿を作成します — バリデーションと永続化は PostService に委譲します。

    アセット／製品の検証、タグの正規化、DB へのコミットなどのビジネスルールは
    `PostService.create_post` に集約されており、ルーターは薄く保たれます。
    """
    post = post_service.create_post(post_in=post_in, current_user=current_user)

    # 投稿数・初投稿バッジの自動判定
    try:
        badge_service.ensure_default_badges()
        badge_service.evaluate_and_award(
            current_user.id,
            categories=[BadgeCategory.POSTS, BadgeCategory.FIRST_ACTION],
        )
    except Exception:
        pass  # バッジ判定失敗で投稿作成をロールバックしない

    return PostRead.model_validate(post)


@router.get("/{id}", response_model=PostRead)
def get_post_detail(
    id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    post_service: PostService = Depends(get_post_service),
    like_service: LikeService = Depends(get_like_service),
):
    """投稿の詳細を取得します。

    - 公開投稿は誰でも閲覧可能
    - 下書き・アーカイブ投稿は投稿者本人のみ閲覧可能
    - is_liked フィールドは現在のユーザーがいいねしているかを表す

    Args:
        id: 投稿 ID
        current_user: 現在のユーザー（認証済みの場合、オプショナル）
        post_service: 投稿サービス

    Returns:
        PostRead: 投稿詳細（user, assets, products, tags, is_liked を含む）

    Raises:
        HTTPException: 404（投稿が存在しない）、403（アクセス権限がない）
    """
    post = post_service.get_post_by_id(post_id=id, current_user=current_user)
    is_liked = False
    if current_user:
        liked_ids = like_service.get_liked_post_ids_for_user(current_user.id, [post.id])
        is_liked = post.id in liked_ids
    return PostRead.model_validate(post).model_copy(update={"is_liked": is_liked})


@router.patch("/{id}", response_model=PostRead)
def update_post(
    id: str,
    post_in: PostUpdate,
    if_match: Optional[str] = Header(default=None),
    current_user: User = Depends(get_current_user),
    post_service: PostService = Depends(get_post_service),
):
    """投稿を更新します。

    - **If-Match header**: 楽観的ロックに使用します。`GET /api/posts/{id}` で取得した `updated_at` (timestamp) を指定してください。
      他者が変更していた場合、`409 Conflict` が返されます。
    """
    return PostRead.model_validate(
        post_service.update_post(
            post_id=id,
            post_in=post_in,
            current_user=current_user,
            etag=if_match
        )
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    id: str,
    current_user: User = Depends(get_current_user),
    post_service: PostService = Depends(get_post_service),
):
    """投稿を削除（論理削除）します。"""
    post_service.delete_post(post_id=id, current_user=current_user)
