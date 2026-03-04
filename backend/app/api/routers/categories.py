from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.deps import get_category_service
from app.services.category_service import CategoryService
from app.schemas.category import CategoryRead

router = APIRouter(redirect_slashes=False)


@router.get("/", response_model=List[CategoryRead])
def list_categories(
    db: Session = Depends(get_db),
    svc: CategoryService = Depends(get_category_service),
):
    cats = svc.list(db)
    return [CategoryRead.model_validate(c) for c in cats]


@router.get("/{slug}", response_model=CategoryRead)
def get_category(slug: str, db: Session = Depends(get_db), svc: CategoryService = Depends(get_category_service)):
    cat = svc.get_by_slug(db, slug=slug, active_only=True)
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="category not found")
    return CategoryRead.model_validate(cat)
