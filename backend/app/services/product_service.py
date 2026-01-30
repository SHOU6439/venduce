from __future__ import annotations

from typing import Optional, List, Any, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import desc, asc, or_, func
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.product import Product
from app.models.category import Category
from app.models.brand import Brand
from app.models.asset import Asset
from app.models.enums import ProductStatus
from app.schemas.product import ProductCreate
from app.utils.cursor import encode_cursor, decode_cursor


class ProductService:
    def create_product(
        self, db: Session, *, payload: ProductCreate
    ) -> Product:
        sku = payload.sku.strip().upper() if payload.sku else None
        existing = db.query(Product).filter(Product.sku == sku).first()
        if existing:
            raise ValueError("sku already exists")
        product = Product(
            title=payload.title,
            sku=sku,
            description=payload.description,
            price_cents=payload.price_cents,
            currency=payload.currency,
            stock_quantity=payload.stock_quantity,
            status=payload.status,
            extra_metadata=payload.metadata,
        )
        db.add(product)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise ValueError("sku already exists")
        
        if payload.asset_ids:
            assets = db.query(Asset).filter(Asset.id.in_(payload.asset_ids)).all()
            if len(assets) != len(payload.asset_ids):
                missing_ids = set(payload.asset_ids) - {a.id for a in assets}
                raise ValueError(f"Some assets not found: {missing_ids}")
            for asset in assets:
                product.assets.append(asset)
        
        db.commit()
        db.refresh(product)
        return product


    def get_by_id(self, db: Session, product_id: str) -> Product:
        product = (
            db.query(Product)
            .options(
                joinedload(Product.brand),
                selectinload(Product.categories),
                selectinload(Product.assets),
            )
            .filter(Product.id == product_id)
            .first()
        )
        
        if not product:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Product not found",
            )
        return product

    def is_visible_to_user(self, product: Product, is_superuser: bool = False) -> bool:
        if product.status == "published":
            return True
        if is_superuser:
            return True
        return False

    def list(
        self,
        db: Session,
        *,
        page: int = 1,
        per_page: int = 20,
        cursor: Optional[str] = None,
        limit: int = 20,
        sort: str = "created_at:desc",
        q: Optional[str] = None,
        status: Optional[str] = None,
        price_min: Optional[int] = None,
        price_max: Optional[int] = None,
        category_slug: Optional[str] = None,
        brand_slug: Optional[str] = None,
        is_admin: bool = False,
        use_cursor_pagination: bool = False,
    ) -> dict[str, Any]:
        """
        商品一覧を取得します（ページネーション or カーソル方式）。
        """
        query = db.query(Product).options(
            joinedload(Product.brand),
            selectinload(Product.categories),
            selectinload(Product.assets),
        )

        if not is_admin:
            query = query.filter(Product.status == ProductStatus.PUBLISHED.value)
        elif status:
            if status not in [s.value for s in ProductStatus]:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {status}"
                )
            query = query.filter(Product.status == status)

        if q:
            search = f"%{q}%"
            query = query.filter(
                or_(Product.title.ilike(search), Product.description.ilike(search))
            )

        if price_min is not None:
            query = query.filter(Product.price_cents >= price_min)
        if price_max is not None:
            query = query.filter(Product.price_cents <= price_max)

        if category_slug:
            query = query.join(Product.categories).filter(Category.slug == category_slug)

        if brand_slug:
            query = query.join(Product.brand).filter(Brand.slug == brand_slug)

        sort_field = "created_at"
        sort_dir = "desc"
        if sort and ":" in sort:
            parts = sort.split(":")
            if len(parts) == 2:
                sort_field, sort_dir = parts

        allowed_sort_fields = ["created_at", "price_cents", "title", "updated_at", "stock_quantity"]
        if sort_field not in allowed_sort_fields:
            sort_field = "created_at"

        attr = getattr(Product, sort_field)
        id_attr = getattr(Product, "id")

        if use_cursor_pagination or cursor is not None:
            if cursor:
                try:
                    cursor_created_at, cursor_id = decode_cursor(cursor)
                    if sort_dir == "asc":
                        query = query.filter(
                            (attr > cursor_created_at) |
                            ((attr == cursor_created_at) & (id_attr > cursor_id))
                        )
                    else:
                        query = query.filter(
                            (attr < cursor_created_at) |
                            ((attr == cursor_created_at) & (id_attr < cursor_id))
                        )
                except Exception:
                    raise HTTPException(
                        status_code=http_status.HTTP_400_BAD_REQUEST,
                        detail="Invalid cursor"
                    )

            if sort_dir == "asc":
                query = query.order_by(asc(attr), asc(id_attr))
            else:
                query = query.order_by(desc(attr), desc(id_attr))

            items = query.limit(limit + 1).all()

            has_next = len(items) > limit
            if has_next:
                items = items[:limit]

            next_cursor = None
            if has_next and items:
                last_item = items[-1]
                next_cursor = encode_cursor(last_item.created_at, last_item.id)

            return {
                "items": items,
                "next_cursor": next_cursor,
                "limit": limit,
                "has_next": has_next,
            }

        else:
            if sort_dir == "asc":
                query = query.order_by(asc(attr))
            else:
                query = query.order_by(desc(attr))

            total = query.count()
            total_pages = (total + per_page - 1) // per_page
            items = query.offset((page - 1) * per_page).limit(per_page).all()

            return {
                "items": items,
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": total_pages,
            }


    def is_visible_to_user(self, product: Product, is_admin: bool) -> bool:
        if is_admin:
            return True
        return product.status == ProductStatus.PUBLISHED.value


product_service = ProductService()

__all__ = ["ProductService", "product_service"]
