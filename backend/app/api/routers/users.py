from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, select
from typing import List, Optional
from app.schemas.user import UserRead, UserUpdate, PublicUserRead, UserPostStats, UserRankingItem, RankingResponse
from app.schemas.asset import AssetRead
from app.schemas.post import PostRead
from app.schemas.purchase import PurchaseRead
from app.schemas.product import ProductRead
from app.schemas.pagination import PaginatedResponse, CursorMeta
from app.models.user import User
from app.models.post import Post
from app.models.enums import PostStatus
from app.db.database import get_db
from app.deps import get_current_user, get_user_service, get_post_service, get_like_service, get_purchase_service
from app.services.post_service import PostService
from app.services.like_service import LikeService
from app.services.purchase_service import PurchaseService


router = APIRouter(redirect_slashes=False)

@router.get("/me", response_model=UserRead)
def read_user_me(
    current_user: User = Depends(get_current_user),
) -> UserRead:
    """
    現在のログインユーザーのプロフィール情報を取得します。
    """
    user_dict = current_user.__dict__.copy()
    if hasattr(current_user, "avatar_asset") and current_user.avatar_asset:
        user_dict["avatar_asset"] = AssetRead.model_validate(current_user.avatar_asset)
    else:
        user_dict["avatar_asset"] = None
    return UserRead.model_validate(user_dict)


@router.get("/me/stats", response_model=UserPostStats)
def get_my_post_stats(
    current_user: User = Depends(get_current_user),
    post_service: PostService = Depends(get_post_service),
) -> UserPostStats:
    """現在のユーザーの投稿集計（累計いいね・購入数・投稿数）を返します。"""
    posts = post_service.get_posts_by_user(user_id=current_user.id)
    return UserPostStats(
        post_count=len(posts),
        total_likes=sum(p.like_count for p in posts),
        total_purchases=sum(p.purchase_count for p in posts),
    )


@router.get("/search", response_model=List[PublicUserRead])
def search_users(
    q: str = Query(..., min_length=1, max_length=100, description="検索クエリ（ユーザー名で部分一致検索）"),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> List[PublicUserRead]:
    """ユーザー名で部分一致検索します（認証不要）。"""
    users = (
        db.query(User)
        .filter(
            User.is_active.is_(True),
            User.username.ilike(f"%{q}%"),
        )
        .order_by(User.username)
        .limit(limit)
        .all()
    )
    result = []
    for user in users:
        user_dict = user.__dict__.copy()
        if hasattr(user, "avatar_asset") and user.avatar_asset:
            user_dict["avatar_asset"] = AssetRead.model_validate(user.avatar_asset)
        else:
            user_dict["avatar_asset"] = None
        user_dict["display_name"] = user.username
        result.append(PublicUserRead.model_validate(user_dict))
    return result


@router.get("/ranking", response_model=RankingResponse)
def get_user_ranking(
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db),
) -> RankingResponse:
    """いいね累計数上位ユーザーのランキングを返します（認証不要・オフセットページネーション）。"""
    base_query = (
        db.query(
            Post.user_id,
            func.sum(Post.like_count).label("total_likes"),
            func.sum(Post.purchase_count).label("total_purchases"),
        )
        .filter(Post.deleted_at.is_(None), Post.status == PostStatus.PUBLIC)
        .group_by(Post.user_id)
    )

    # 総件数
    total = base_query.count()

    rows = (
        base_query
        .order_by(func.sum(Post.like_count).desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    if not rows:
        return RankingResponse(items=[], total=total, offset=offset, limit=limit, has_more=False)

    user_ids = [r.user_id for r in rows]
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    user_map = {u.id: u for u in users}

    items = []
    for rank_idx, row in enumerate(rows):
        u = user_map.get(row.user_id)
        if not u:
            continue
        avatar_url = None
        if hasattr(u, "avatar_asset") and u.avatar_asset:
            avatar_url = u.avatar_asset.public_url
        items.append(UserRankingItem(
            user_id=u.id,
            username=u.username,
            display_name=u.username,
            avatar_url=avatar_url,
            total_likes=int(row.total_likes or 0),
            total_purchases=int(row.total_purchases or 0),
            rank=offset + rank_idx + 1,
        ))

    has_more = (offset + limit) < total
    return RankingResponse(items=items, total=total, offset=offset, limit=limit, has_more=has_more)


@router.patch("/me", response_model=UserRead)
def update_user_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    user_service = Depends(get_user_service),
) -> UserRead:
    """
    現在のログインユーザーのプロフィール情報を更新します。
    """
    updated = user_service.update_profile(db, current_user, user_update)
    user_dict = updated.__dict__.copy()
    if hasattr(updated, "avatar_asset") and updated.avatar_asset:
        user_dict["avatar_asset"] = AssetRead.model_validate(updated.avatar_asset)
    else:
        user_dict["avatar_asset"] = None
    return UserRead.model_validate(user_dict)


@router.get("/{username}", response_model=PublicUserRead)
def get_user_by_username(
    username: str,
    db: Session = Depends(get_db),
) -> PublicUserRead:
    """ユーザー名でユーザーの公開プロフィールを取得します（認証不要）。"""
    user = db.query(User).filter(User.username == username, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    user_dict = user.__dict__.copy()
    if hasattr(user, "avatar_asset") and user.avatar_asset:
        user_dict["avatar_asset"] = AssetRead.model_validate(user.avatar_asset)
    else:
        user_dict["avatar_asset"] = None
    # 本名は公開しない。ユーザー名のみ返す
    user_dict["display_name"] = user.username
    return PublicUserRead.model_validate(user_dict)


@router.get("/{username}/stats", response_model=UserPostStats)
def get_user_stats_by_username(
    username: str,
    db: Session = Depends(get_db),
    post_service: PostService = Depends(get_post_service),
) -> UserPostStats:
    """ユーザー名で指定されたユーザーの投稿集計を返します（認証不要）。"""
    user = db.query(User).filter(User.username == username, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    posts = post_service.get_posts_by_user(user_id=user.id)
    return UserPostStats(
        post_count=len(posts),
        total_likes=sum(p.like_count for p in posts),
        total_purchases=sum(p.purchase_count for p in posts),
    )


@router.get("/{username}/posts", response_model=PaginatedResponse[PostRead])
def get_user_posts_by_username(
    username: str,
    cursor: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    post_service: PostService = Depends(get_post_service),
) -> PaginatedResponse[PostRead]:
    """ユーザー名で指定されたユーザーの公開投稿一覧を返します（認証不要）。"""
    user = db.query(User).filter(User.username == username, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    posts, next_cursor, has_more = post_service.get_public_posts(
        cursor=cursor, limit=limit, user_id=user.id
    )
    return PaginatedResponse(
        items=[PostRead.model_validate(p) for p in posts],
        meta=CursorMeta(next_cursor=next_cursor, has_more=has_more, returned=len(posts)),
    )


@router.get("/{username}/likes", response_model=PaginatedResponse[PostRead])
def get_user_liked_posts_by_username(
    username: str,
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    like_service: LikeService = Depends(get_like_service),
) -> PaginatedResponse[PostRead]:
    """ユーザー名で指定されたユーザーがいいねした投稿一覧を返します（認証不要）。"""
    user = db.query(User).filter(User.username == username, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    posts, next_cursor, has_more = like_service.get_liked_posts_by_user(
        user_id=user.id, limit=limit, cursor=cursor,
    )
    items = [PostRead.model_validate(p) for p in posts]
    return PaginatedResponse(
        items=items,
        meta=CursorMeta(next_cursor=next_cursor, has_more=has_more, returned=len(items)),
    )


@router.get("/{username}/purchases", response_model=PaginatedResponse[PurchaseRead])
def get_user_purchases_by_username(
    username: str,
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    service: PurchaseService = Depends(get_purchase_service),
) -> PaginatedResponse[PurchaseRead]:
    """ユーザー名で指定されたユーザーの購入履歴を返します（公開設定がオンの場合のみ）。"""
    user = db.query(User).filter(User.username == username, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    if not user.is_purchase_history_public:
        raise HTTPException(status_code=403, detail="このユーザーの購入履歴は非公開です")
    purchases, next_cursor, has_more = service.list_user_purchases(
        db, user=user, cursor=cursor, limit=limit,
    )
    result = []
    for p in purchases:
        purchase_dict = {
            'id': p.id,
            'buyer_id': p.buyer_id,
            'product_id': p.product_id,
            'quantity': p.quantity,
            'price_cents': p.price_cents,
            'total_amount_cents': p.total_amount_cents,
            'currency': p.currency,
            'payment_method_id': p.payment_method_id,
            'referring_post_id': p.referring_post_id,
            'status': p.status,
            'created_at': p.created_at,
            'updated_at': p.updated_at,
            'product': ProductRead.model_validate(p.product) if p.product else None,
        }
        result.append(PurchaseRead.model_validate(purchase_dict))
    return PaginatedResponse(
        items=result,
        meta=CursorMeta(next_cursor=next_cursor, has_more=has_more, returned=len(result)),
    )
