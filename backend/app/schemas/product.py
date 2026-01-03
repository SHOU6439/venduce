from __future__ import annotations

from pydantic import Field, conint, ConfigDict
from app.schemas.base import AppModel
from typing import List, Optional
from datetime import datetime
from app.models.enums import ProductStatus


class ProductCreate(AppModel):
    title: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=64)
    description: Optional[str] = None
    price_cents: conint(ge=1) = 1
    currency: str = Field(default="JPY", min_length=3, max_length=8)
    status: ProductStatus = Field(default=ProductStatus.DRAFT)
    stock_quantity: conint(ge=1) = 1
    metadata: Optional[dict] = Field(default=None, alias="extra_metadata")


class ProductRead(AppModel):
    id: str
    title: str
    sku: str
    description: Optional[str] = None
    price_cents: int
    currency: str
    stock_quantity: int
    status: ProductStatus
    metadata: Optional[dict] = Field(default=None, alias="extra_metadata")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


__all__ = ["ProductCreate", "ProductRead"]
