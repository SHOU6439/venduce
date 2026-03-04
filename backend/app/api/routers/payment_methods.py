from typing import List
from fastapi import APIRouter, Depends, status

from app.db.database import get_db
from app.models.user import User
from app.schemas.payment_method import PaymentMethodCreate, PaymentMethodRead, PaymentMethodUpdate
from app.services.payment_method_service import PaymentMethodService
from app.deps import get_current_user, get_payment_method_service
from sqlalchemy.orm import Session

router = APIRouter(redirect_slashes=False)


@router.post("", response_model=PaymentMethodRead, status_code=status.HTTP_201_CREATED)
def create_payment_method(
    payload: PaymentMethodCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: PaymentMethodService = Depends(get_payment_method_service),
):
    """現在のユーザーのための新しい支払い方法を作成します。"""
    return service.create_payment_method(db, user=current_user, payload=payload)


@router.get("", response_model=List[PaymentMethodRead])
def list_payment_methods(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: PaymentMethodService = Depends(get_payment_method_service),
):
    """現在のユーザーのすべての支払い方法を一覧表示します。"""
    return service.list_user_payment_methods(db, user=current_user)


@router.get("/{payment_method_id}", response_model=PaymentMethodRead)
def get_payment_method(
    payment_method_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: PaymentMethodService = Depends(get_payment_method_service),
):
    """特定の支払い方法を取得します。"""
    return service.get_payment_method(db, payment_method_id=payment_method_id, user=current_user)


@router.patch("/{payment_method_id}", response_model=PaymentMethodRead)
def update_payment_method(
    payment_method_id: str,
    payload: PaymentMethodUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: PaymentMethodService = Depends(get_payment_method_service),
):
    """支払い方法を更新します。"""
    return service.update_payment_method(
        db, payment_method_id=payment_method_id, user=current_user, payload=payload
    )


@router.delete("/{payment_method_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment_method(
    payment_method_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: PaymentMethodService = Depends(get_payment_method_service),
):
    """支払い方法を削除します。"""
    service.delete_payment_method(db, payment_method_id=payment_method_id, user=current_user)


__all__ = ["router"]
