from __future__ import annotations

from pydantic import Field, conint, ConfigDict
from app.schemas.base import AppModel
from typing import List, Optional
from datetime import datetime
from app.models.enums import ProductStatus
from app.schemas.brand import BrandRead


class CategoryBase(AppModel):
    id: str
    name: str
    slug: str

    model_config = ConfigDict(from_attributes=True)


class ProductBase(AppModel):
    title: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=64)
    description: Optional[str] = None
    price_cents: conint(ge=0) = 0
    currency: str = Field(default="JPY", min_length=3, max_length=8)
    status: ProductStatus = Field(default=ProductStatus.DRAFT)
    stock_quantity: conint(ge=0) = 0
    metadata: Optional[dict] = Field(default=None, alias="extra_metadata")


class ProductCreate(ProductBase):
    stock_quantity: conint(ge=1) = 1
    price_cents: conint(ge=1) = 1


class ProductRead(ProductBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    categories: List[CategoryBase] = []
    brand: Optional[BrandRead] = None

    model_config = ConfigDict(from_attributes=True)


class ProductList(AppModel):
    items: List[ProductRead]
    total: int
    page: int
    per_page: int
    total_pages: int


__all__ = ["CategoryBase", "ProductBase", "ProductCreate", "ProductRead", "ProductList"]
