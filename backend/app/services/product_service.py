from __future__ import annotations

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Any
from app.models.product import Product


class ProductService:
    def create_product(
        self, db: Session, *, payload: dict[str, Any]
    ) -> Product:

        existing = db.query(Product).filter(Product.sku == payload["sku"]).first()
        if existing:
            raise ValueError("sku already exists")

        product = Product(
            title=payload.get("title"),
            sku=payload.get("sku"),
            description=payload.get("description"),
            price_cents=payload.get("price_cents", 0),
            currency=payload.get("currency", "JPY"),
            categories=payload.get("categories"),
            stock_quantity=payload.get("stock_quantity", 0),
            status=payload.get("status", "draft"),
            metadata=payload.get("metadata"),
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
