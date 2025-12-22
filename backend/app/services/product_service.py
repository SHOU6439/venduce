from __future__ import annotations

from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.product import Product
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
                selectinload(Product.images),
            )
            .filter(Product.id == product_id)
            .first()
        )
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found",
            )
        return product

    def is_visible_to_user(self, product: Product, is_superuser: bool = False) -> bool:
        if product.status == "published":
            return True
        if is_superuser:
            return True
        return False


product_service = ProductService()

__all__ = ["ProductService", "product_service"]
