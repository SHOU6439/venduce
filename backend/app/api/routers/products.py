from typing import Any, Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.config import settings
from app.models.user import User
from app.schemas.product import ProductRead, ProductList
from app.schemas.pagination import PaginatedResponse, CursorMeta
from app.services.product_service import ProductService
from app.deps import get_product_service, get_current_user_optional
from app.utils import jwt as jwt_utils

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", summary="List products")
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