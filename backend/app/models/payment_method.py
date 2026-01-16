from __future__ import annotations

from ulid import ULID
from sqlalchemy import Column, String, DateTime, func, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.db.database import Base
from app.models.enums import PaymentType


class PaymentMethod(Base):
    """ユーザーの支払い方法を表すモデル

    Fields:
        id: ULID
        user_id: ユーザーID（FK → users.id）
        payment_type: 支払い方法の種類（credit_card, convenience_store, bank_transfer等）
        name: ユーザーが付けた支払い方法の名前（例：「My Visa Card」）
        details: 支払い方法の詳細情報（JSONB形式、マスク済み）
        is_default: デフォルト支払い方法フラグ
        created_at: 作成日時
        updated_at: 更新日時
    """

    __tablename__ = "payment_methods"

    id = Column(String(26), primary_key=True, index=True, default=lambda: str(ULID()))
    user_id = Column(String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_type = Column(
        Enum(PaymentType, name="paymenttype", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
    )
    name = Column(String(255), nullable=False)
    details = Column(JSONB, nullable=True)
    is_default = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user = relationship("User", backref="payment_methods")


__all__ = ["PaymentMethod"]
