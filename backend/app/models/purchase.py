from __future__ import annotations

from ulid import ULID
from sqlalchemy import Column, String, DateTime, func, ForeignKey, Integer, Enum
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.models.enums import PurchaseStatus


class Purchase(Base):
    """ユーザーの購入記録を表すモデル

    Fields:
        id: ULID
        buyer_id: 購入者ID（FK → users.id）
        product_id: 商品ID（FK → products.id）
        total_amount_cents: 合計金額
        quantity: 購入数量
        price_cents: 購入時の価格（最小通貨単位）
        currency: 通貨コード（例: JPY）
        payment_method_id: 支払い方法ID（FK → payment_methods.id）
        referring_post_id: 帰属投稿ID（FK → posts.id、nullable）
                           NULL = 直接購入、値あり = 投稿経由での購入
        status: 購入ステータス（completed, pending, refunded等）
        created_at: 購入日時
        updated_at: 更新日時
    """

    __tablename__ = "purchases"

    id = Column(String(26), primary_key=True, index=True, default=lambda: str(ULID()))
    buyer_id = Column(String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(26), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=1)
    price_cents = Column(Integer, nullable=False)
    total_amount_cents = Column(Integer, nullable=False)
    currency = Column(String(8), nullable=False, default="JPY")
    payment_method_id = Column(String(26), ForeignKey("payment_methods.id", ondelete="SET NULL"), nullable=True, index=True)
    referring_post_id = Column(String(26), ForeignKey("posts.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(
        Enum(
            PurchaseStatus,
            name="purchasestatus",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=PurchaseStatus.COMPLETED,
        index=True,
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    buyer = relationship("User", backref="purchases")
    product = relationship("Product", backref="purchases")
    payment_method = relationship("PaymentMethod", backref="purchases")
    referring_post = relationship("Post", backref="purchases_from_post")


__all__ = ["Purchase"]
