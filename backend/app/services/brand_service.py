from __future__ import annotations

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.brand import Brand
from app.schemas.brand import BrandCreate


class BrandService:
    def create_brand(self, db: Session, *, payload: BrandCreate) -> Brand:
        slug = payload.slug.strip().lower() if payload.slug else None
        if slug:
            existing = db.query(Brand).filter(Brand.slug == slug).first()
            if existing:
                raise ValueError("slug already exists")

        brand = Brand(
            name=payload.name,
            slug=slug or payload.name.lower().replace(" ", "-"),
            description=payload.description,
            is_active=payload.is_active,
            image_asset_id=payload.image_asset_id,
            extra_metadata=payload.metadata,
        )
        db.add(brand)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise ValueError("slug already exists")
        db.refresh(brand)
        return brand

    def get_by_slug(self, db: Session, slug: str, *, active_only: bool = True) -> Brand | None:
        q = db.query(Brand).filter(Brand.slug == slug)
        if active_only:
            q = q.filter(Brand.is_active == True)
        return q.first()

    def list(self, db: Session, *, active_only: bool = True, limit: int = 100, offset: int = 0) -> list[Brand]:
        q = db.query(Brand)
        if active_only:
            q = q.filter(Brand.is_active == True)
        return q.order_by(Brand.name.asc()).limit(limit).offset(offset).all()


brand_service = BrandService()

__all__ = ["BrandService", "brand_service"]
