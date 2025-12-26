from __future__ import annotations

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.asset import AssetRead
from app.schemas.product import ProductRead
from app.schemas.user import UserRead
from app.models.enums import PostStatus


class TagRead(BaseModel):
    id: str
    name: str
    usage_count: int

    class Config:
        from_attributes = True


class PostBase(BaseModel):
    caption: Optional[str] = None
    status: PostStatus = PostStatus.PUBLIC
    extra_metadata: Optional[dict] = None


class PostCreate(PostBase):
    asset_ids: List[str] = Field(..., min_length=1, max_length=10)
    product_ids: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list, max_length=10, description="List of tag names")


class PostRead(PostBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    purchase_count: int
    view_count: int
    like_count: int

    user: Optional[UserRead] = None
    products: List[ProductRead] = []
    tags: List[TagRead] = []
    images: List[AssetRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
