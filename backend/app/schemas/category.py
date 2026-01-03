from __future__ import annotations

from typing import Optional
from pydantic import Field, ConfigDict
from app.schemas.base import AppModel
from datetime import datetime


class CategoryCreate(AppModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: Optional[str] = Field(default=None, min_length=1, max_length=128)
    description: Optional[str] = None
    parent_id: Optional[str] = None
    is_active: bool = True
    image_asset_id: Optional[str] = None
    metadata: Optional[dict] = Field(default=None, alias="extra_metadata")


class CategoryRead(AppModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    parent_id: Optional[str] = None
    is_active: bool
    image_asset_id: Optional[str] = None
    metadata: Optional[dict] = Field(default=None, alias="extra_metadata")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


__all__ = ["CategoryCreate", "CategoryRead"]
