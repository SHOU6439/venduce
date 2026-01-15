from __future__ import annotations

from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.payment_method import PaymentMethod
from app.models.user import User
from app.schemas.payment_method import PaymentMethodCreate, PaymentMethodUpdate


class PaymentMethodService:
    """支払い方法の CRUD 操作をサポート。"""

    def create_payment_method(
        self, db: Session, *, user: User, payload: PaymentMethodCreate
    ) -> PaymentMethod:
        """ユーザーの新しい支払い方法を作成します。"""
        payment_method = PaymentMethod(
            user_id=user.id,
            payment_type=payload.payment_type,
            name=payload.name,
            details=payload.details,
            is_default=payload.is_default,
        )

        if payload.is_default:
            db.query(PaymentMethod).filter(
                PaymentMethod.user_id == user.id,
                PaymentMethod.is_default == True,
            ).update({"is_default": False})

        db.add(payment_method)
        db.commit()
        db.refresh(payment_method)
        return payment_method

    def list_user_payment_methods(self, db: Session, *, user: User) -> List[PaymentMethod]:
        """ユーザーのすべての支払い方法を取得します。"""
        return (
            db.query(PaymentMethod)
            .filter(PaymentMethod.user_id == user.id)
            .order_by(PaymentMethod.is_default.desc(), PaymentMethod.created_at.desc())
            .all()
        )

    def get_payment_method(self, db: Session, *, payment_method_id: str, user: User) -> PaymentMethod:
        """特定の支払い方法を取得します（所有者確認付き）。"""
        payment_method = (
            db.query(PaymentMethod)
            .filter(
                PaymentMethod.id == payment_method_id,
                PaymentMethod.user_id == user.id,
            )
            .first()
        )

        if not payment_method:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment method not found",
            )
        return payment_method

    def update_payment_method(
        self, db: Session, *, payment_method_id: str, user: User, payload: PaymentMethodUpdate
    ) -> PaymentMethod:
        """支払い方法を更新します。"""
        payment_method = self.get_payment_method(db, payment_method_id=payment_method_id, user=user)

        if payload.name is not None:
            payment_method.name = payload.name

        if payload.is_default is not None and payload.is_default:
            db.query(PaymentMethod).filter(
                PaymentMethod.user_id == user.id,
                PaymentMethod.is_default == True,
            ).update({"is_default": False})
            payment_method.is_default = True

        db.add(payment_method)
        db.commit()
        db.refresh(payment_method)
        return payment_method

    def delete_payment_method(self, db: Session, *, payment_method_id: str, user: User) -> None:
        """支払い方法を削除します。"""
        payment_method = self.get_payment_method(db, payment_method_id=payment_method_id, user=user)
        db.delete(payment_method)
        db.commit()


payment_method_service = PaymentMethodService()

__all__ = ["PaymentMethodService", "payment_method_service"]
