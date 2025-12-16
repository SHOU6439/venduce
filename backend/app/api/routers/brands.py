from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.deps import get_brand_service
from app.services.brand_service import BrandService
from app.schemas.brand import BrandRead

router = APIRouter(prefix="/api/brands", tags=["brands"])


@router.get("/", response_model=List[BrandRead])
def list_brands(db: Session = Depends(get_db), svc: BrandService = Depends(get_brand_service)):
    brands = svc.list(db)
    return [BrandRead.model_validate(b) for b in brands]


@router.get("/{slug}", response_model=BrandRead)
def get_brand(slug: str, db: Session = Depends(get_db), svc: BrandService = Depends(get_brand_service)):
    brand = svc.get_by_slug(db, slug=slug)
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="brand not found")
    return BrandRead.model_validate(brand)
