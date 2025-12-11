from __future__ import annotations

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Any
from app.models.product import Product
from app.schemas.product import ProductCreate
from app.models.user import User
from app.exceptions import AuthenticationError


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


product_service = ProductService()

__all__ = ["ProductService", "product_service"]
