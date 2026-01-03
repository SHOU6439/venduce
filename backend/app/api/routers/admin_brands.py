from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.deps import get_admin_user, get_brand_service
from app.services.brand_service import BrandService
from app.schemas.brand import BrandCreate, BrandRead
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=BrandRead, status_code=status.HTTP_201_CREATED)
def create_brand(
    payload: BrandCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
    svc: BrandService = Depends(get_brand_service),
):
    try:
        brand = svc.create_brand(db, payload=payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return BrandRead.model_validate(brand)
