from __future__ import annotations

from pydantic import Field, ConfigDict
from app.schemas.base import AppModel
from app.models.enums import PaymentType
from typing import Optional
from datetime import datetime


class PaymentMethodBase(AppModel):
    payment_type: PaymentType
    name: str = Field(..., min_length=1, max_length=255)
    details: Optional[dict] = None
    is_default: bool = Field(default=False)


class PaymentMethodCreate(PaymentMethodBase):
    pass


class PaymentMethodUpdate(AppModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    is_default: Optional[bool] = None


class PaymentMethodRead(PaymentMethodBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


__all__ = ["PaymentMethodBase", "PaymentMethodCreate", "PaymentMethodUpdate", "PaymentMethodRead"]
