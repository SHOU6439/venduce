from typing import Any, Optional, List
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from pydantic import ValidationError
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.post import Post
from app.models.product import Product
from app.models.post_products import post_products
from app.models.enums import PostStatus
from app.schemas.product import (
    ProductRead,
    ProductList,
    MostLikedProductItem,
    MostLikedProductsResponse,
    TrendingProductItem,
    TrendingProductsResponse,
)
from app.schemas.pagination import PaginatedResponse, CursorMeta
from app.services.product_service import ProductService
from app.deps import get_product_service, get_current_user_optional
from app.utils import jwt as jwt_utils

router = APIRouter(redirect_slashes=False)
logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# いいねが多い商品ランキング（オフセットページネーション）
# ------------------------------------------------------------------

@router.get("/most-liked", response_model=MostLikedProductsResponse, summary="Most liked products ranking")
def get_most_liked_products(
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> MostLikedProductsResponse:
    """投稿経由の累計いいね数で商品をランキングします（認証不要）。"""

    base_query = (
        db.query(
            post_products.c.product_id,
            func.sum(Post.like_count).label("total_likes"),
        )
        .join(Post, Post.id == post_products.c.post_id)
        .filter(Post.deleted_at.is_(None), Post.status == PostStatus.PUBLIC)
        .group_by(post_products.c.product_id)
    )

    total = base_query.count()

    rows = (
        base_query
        .order_by(func.sum(Post.like_count).desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    if not rows:
        return MostLikedProductsResponse(items=[], total=total, offset=offset, limit=limit, has_more=False)

    product_ids = [r.product_id for r in rows]
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    product_map = {p.id: p for p in products}

    items = []
    for rank_idx, row in enumerate(rows):
        p = product_map.get(row.product_id)
        if not p:
            continue
        items.append(MostLikedProductItem(
            product=ProductRead.model_validate(p),
            total_likes=int(row.total_likes or 0),
            rank=offset + rank_idx + 1,
        ))

    has_more = (offset + limit) < total
    return MostLikedProductsResponse(items=items, total=total, offset=offset, limit=limit, has_more=has_more)


# ------------------------------------------------------------------
# 売れている商品ランキング（購入回数順、オフセットページネーション）
# ------------------------------------------------------------------

@router.get("/trending", response_model=TrendingProductsResponse, summary="Trending products by purchase count")
def get_trending_products(
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> TrendingProductsResponse:
    """実際の購入回数（purchases テーブル）＋シードの投稿 purchase_count で
    商品をランキングします（認証不要）。

    直接購入（referring_post_id なし）は purchases テーブルのみに記録され、
    投稿経由の購入は purchases テーブルと posts.purchase_count の両方に記録されるため、
    重複を避けつつ両方を合算する。
    """
    from app.models.purchase import Purchase as PurchaseModel
    from app.models.enums import PurchaseStatus

    # --- サブクエリ: purchases テーブルから直接購入（referring_post_id IS NULL）の件数 ---
    direct_purchase_sub = (
        db.query(
            PurchaseModel.product_id.label("product_id"),
            func.count(PurchaseModel.id).label("direct_cnt"),
        )
        .filter(
            PurchaseModel.status == PurchaseStatus.COMPLETED,
            PurchaseModel.referring_post_id.is_(None),
        )
        .group_by(PurchaseModel.product_id)
        .subquery()
    )

    # --- サブクエリ: post_products + posts.purchase_count（投稿経由の購入数）---
    post_purchase_sub = (
        db.query(
            post_products.c.product_id.label("product_id"),
            func.sum(Post.purchase_count).label("post_cnt"),
        )
        .join(Post, Post.id == post_products.c.post_id)
        .filter(Post.deleted_at.is_(None), Post.status == PostStatus.PUBLIC)
        .group_by(post_products.c.product_id)
        .subquery()
    )

    # --- UNION: 両方の product_id 集合を結合して合算 ---
    total_purchases_expr = (
        func.coalesce(post_purchase_sub.c.post_cnt, 0)
        + func.coalesce(direct_purchase_sub.c.direct_cnt, 0)
    ).label("total_purchases")

    base_query = (
        db.query(
            Product.id.label("product_id"),
            total_purchases_expr,
        )
        .outerjoin(post_purchase_sub, post_purchase_sub.c.product_id == Product.id)
        .outerjoin(direct_purchase_sub, direct_purchase_sub.c.product_id == Product.id)
        .filter(
            (func.coalesce(post_purchase_sub.c.post_cnt, 0)
             + func.coalesce(direct_purchase_sub.c.direct_cnt, 0)) > 0
        )
    )

    total = base_query.count()

    rows = (
        base_query
        .order_by(total_purchases_expr.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    if not rows:
        return TrendingProductsResponse(items=[], total=total, offset=offset, limit=limit, has_more=False)

    product_ids = [r.product_id for r in rows]
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    product_map = {p.id: p for p in products}

    items = []
    for rank_idx, row in enumerate(rows):
        p = product_map.get(row.product_id)
        if not p:
            continue
        items.append(TrendingProductItem(
            product=ProductRead.model_validate(p),
            total_purchases=int(row.total_purchases or 0),
            rank=offset + rank_idx + 1,
        ))

    has_more = (offset + limit) < total
    return TrendingProductsResponse(items=items, total=total, offset=offset, limit=limit, has_more=has_more)


@router.get("", summary="List products")
def list_products(
    response: Response,
    page: Optional[int] = Query(None, ge=1, description="ページ番号（従来方式）"),
    per_page: Optional[int] = Query(None, ge=1, le=100, description="1ページあたり件数（従来方式）"),
    cursor: Optional[str] = Query(None, description="次ページ取得用カーソル"),
    limit: Optional[int] = Query(20, ge=1, le=100, description="取得件数（cursor方式）"),
    sort: str = Query("created_at:desc", description="Sort field:dir (e.g. price_cents:asc)"),
    q: Optional[str] = Query(None, description="Search query (title/description)"),
    status: Optional[str] = Query(None, description="Filter by status (admin only)"),
    price_min: Optional[int] = Query(None, description="Minimum price in cents"),
    price_max: Optional[int] = Query(None, description="Maximum price in cents"),
    category: Optional[str] = Query(None, description="Category slug"),
    brand: Optional[str] = Query(None, description="Brand slug"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    service: ProductService = Depends(get_product_service),
) -> Any:
    is_admin = current_user.is_admin if current_user else False
    user_id = current_user.id if current_user else "anonymous"

    logger.info(
        f"Product list access: user={user_id} "
        f"params(q={q}, cat={category}, brand={brand}, page={page}, cursor={cursor}, limit={limit}, sort={sort})"
    )

    use_cursor_pagination = cursor is not None or (page is None and per_page is None)

    if use_cursor_pagination:
        result = service.list(
            db,
            cursor=cursor,
            limit=limit or 20,
            sort=sort,
            q=q,
            status=status,
            price_min=price_min,
            price_max=price_max,
            category_slug=category,
            brand_slug=brand,
            is_admin=is_admin,
            use_cursor_pagination=True,
        )
        if is_admin:
            response.headers["Cache-Control"] = "no-store"
        else:
            response.headers["Cache-Control"] = "public, max-age=60"
            response.headers["Vary"] = "Authorization"

        return PaginatedResponse[ProductRead](
            items=[ProductRead.model_validate(item) for item in result["items"]],
            meta=CursorMeta(
                next_cursor=result.get("next_cursor"),
                has_more=result.get("has_next", False),
                returned=len(result["items"]),
            ),
        )
    else:
        resolved_page = page or 1
        resolved_per_page = per_page or 20
        result = service.list(
            db,
            page=resolved_page,
            per_page=resolved_per_page,
            sort=sort,
            q=q,
            status=status,
            price_min=price_min,
            price_max=price_max,
            category_slug=category,
            brand_slug=brand,
            is_admin=is_admin,
            use_cursor_pagination=False,
        )
        if is_admin:
            response.headers["Cache-Control"] = "no-store"
        else:
            response.headers["Cache-Control"] = "public, max-age=60"
            response.headers["Vary"] = "Authorization"

        return ProductList(
            items=[ProductRead.model_validate(item) for item in result["items"]],
            total=result["total"],
            page=result["page"],
            per_page=result["per_page"],
            total_pages=result["total_pages"],
        )


@router.get("/{product_id}", response_model=ProductRead, summary="Get product details")
def get_product(
    product_id: str,
    response: Response,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    service: ProductService = Depends(get_product_service),
) -> Any:
    product = service.get_by_id(db, product_id)

    is_admin = current_user.is_admin if current_user else False

    if not service.is_visible_to_user(product, is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    if product.status == "published":
        response.headers["Cache-Control"] = "public, max-age=60"
        response.headers["Vary"] = "Authorization"
    else:
        response.headers["Cache-Control"] = "no-store"

    return product
