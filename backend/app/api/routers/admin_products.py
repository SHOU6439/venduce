from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.deps import get_admin_user, get_product_service
from app.services.product_service import ProductService
from app.schemas.product import ProductCreate, ProductRead
from app.models.user import User

router = APIRouter(prefix="/admin/products", tags=["admin-products"])


@router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
    svc: ProductService = Depends(get_product_service),
):
    try:
        product = svc.create_product(db, payload=payload, created_by=admin_user.id)
    except ValueError as exc:
        # Service raises ValueError for SKU conflicts
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return ProductRead.model_validate(product)
