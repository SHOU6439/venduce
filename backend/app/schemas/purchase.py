from __future__ import annotations

from pydantic import Field, conint, ConfigDict
from app.schemas.base import AppModel
from app.models.enums import PurchaseStatus
from typing import Optional
from datetime import datetime


class PurchaseBase(AppModel):
    product_id: str
    quantity: conint(ge=1) = 1
    price_cents: conint(ge=0)
    total_amount_cents: conint(ge=0)
    currency: str = Field(default="JPY", min_length=3, max_length=8)
    payment_method_id: Optional[str] = None
    referring_post_id: Optional[str] = None
    status: PurchaseStatus = PurchaseStatus.COMPLETED


class PurchaseCreate(AppModel):
    """purchase 作成用スキーマ（リクエスト）"""
    product_id: str
    quantity: conint(ge=1) = 1
    price_cents: conint(ge=0)
    total_amount_cents: conint(ge=0)
    currency: str = Field(default="JPY", min_length=3, max_length=8)
    payment_method_id: str
    referring_post_id: Optional[str] = None


class PurchaseRead(PurchaseBase):
    """purchase 読み込み用スキーマ（レスポンス）"""
    id: str
    buyer_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


__all__ = ["PurchaseBase", "PurchaseCreate", "PurchaseRead"]
