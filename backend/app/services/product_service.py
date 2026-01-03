from __future__ import annotations

from typing import Optional, Any

from fastapi import HTTPException, status as http_status
from sqlalchemy import or_, desc, asc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.product import Product
from app.models.category import Category
from app.models.brand import Brand
from app.models.enums import ProductStatus
from app.schemas.product import ProductCreate


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
        db.refresh(product)
        return product

    def get_by_id(self, db: Session, product_id: str) -> Product:
        product = (
            db.query(Product)
            .options(
                joinedload(Product.brand),
                selectinload(Product.categories),
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
        sort: str = "created_at:desc",
        q: Optional[str] = None,
        status: Optional[str] = None,
        price_min: Optional[int] = None,
        price_max: Optional[int] = None,
        category_slug: Optional[str] = None,
        brand_slug: Optional[str] = None,
        is_admin: bool = False,
    ) -> dict[str, Any]:
        query = db.query(Product).options(
            joinedload(Product.brand),
            selectinload(Product.categories),
        )

        if not is_admin:
            query = query.filter(Product.status == "published")
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

product_service = ProductService()

__all__ = ["ProductService", "product_service"]
