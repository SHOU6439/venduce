from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.deps import get_admin_user, get_category_service
from app.services.category_service import CategoryService
from app.schemas.category import CategoryCreate, CategoryRead
from app.models.user import User

router = APIRouter(prefix="/admin/categories", tags=["admin-categories"])


@router.post("/", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
    svc: CategoryService = Depends(get_category_service),
):
    try:
        category = svc.create_category(db, payload=payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return CategoryRead.model_validate(category)
