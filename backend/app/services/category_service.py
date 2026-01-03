from __future__ import annotations

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.category import Category
from app.schemas.category import CategoryCreate
from app.models.user import User
from app.exceptions import AuthenticationError


class CategoryService:
    def create_category(self, db: Session, *, payload: CategoryCreate) -> Category:

        slug = payload.slug.strip().lower() if payload.slug else None
        if slug:
            existing = db.query(Category).filter(Category.slug == slug).first()
            if existing:
                raise ValueError("slug already exists")

        category = Category(
            name=payload.name,
            slug=slug or payload.name.lower().replace(" ", "-"),
            description=payload.description,
            parent_id=payload.parent_id,
            is_active=payload.is_active,
            image_asset_id=payload.image_asset_id,
            extra_metadata=payload.metadata,
        )
        db.add(category)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise ValueError("slug already exists")
        db.refresh(category)
        return category

    def get_by_slug(self, db: Session, slug: str, *, active_only: bool = True) -> Category | None:
        q = db.query(Category).filter(Category.slug == slug)
        if active_only:
            q = q.filter(Category.is_active == True)
        return q.first()

    def list(self, db: Session, *, active_only: bool = True, limit: int = 100, offset: int = 0) -> list[Category]:
        q = db.query(Category)
        if active_only:
            q = q.filter(Category.is_active == True)
        return q.order_by(Category.name.asc()).limit(limit).offset(offset).all()


category_service = CategoryService()

__all__ = ["CategoryService", "category_service"]
