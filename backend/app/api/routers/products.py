from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.config import settings
from app.models.user import User
from app.schemas.product import ProductRead
from app.services.product_service import ProductService
from app.deps import get_product_service, get_current_user_optional
from app.utils import jwt as jwt_utils

router = APIRouter()


@router.get("/{product_id}", response_model=ProductRead, summary="Get product details")
def get_product(
    product_id: str,
    response: Response,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    service: ProductService = Depends(get_product_service),
) -> Any:
    product = service.get_by_id(db, product_id)

    is_admin = current_user.is_admin if current_user else False

    if not service.is_visible_to_user(product, is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    if product.status == "published":
        response.headers["Cache-Control"] = "public, max-age=60"
        response.headers["Vary"] = "Authorization"
    else:
        response.headers["Cache-Control"] = "no-store"

    return product