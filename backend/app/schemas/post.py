from __future__ import annotations

from typing import List, Optional
from datetime import datetime
from pydantic import ConfigDict, Field

from app.schemas.base import AppModel
from app.schemas.asset import AssetRead
from app.schemas.product import ProductRead
from app.schemas.user import UserRead
from app.models.enums import PostStatus


class TagRead(AppModel):
    id: str
    name: str
    usage_count: int

    model_config = ConfigDict(from_attributes=True)


class PostBase(AppModel):
    caption: Optional[str] = None
    status: PostStatus = PostStatus.PUBLIC
    extra_metadata: Optional[dict] = None


class PostCreate(PostBase):
    asset_ids: List[str] = Field(default_factory=list, max_length=10)
    product_ids: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list, max_length=10, description="List of tag names")


class PostUpdate(PostBase):
    caption: Optional[str] = None
    status: Optional[PostStatus] = None
    extra_metadata: Optional[dict] = None
    asset_ids: Optional[List[str]] = None
    product_ids: Optional[List[str]] = None
    tags: Optional[List[str]] = Field(default=None, max_length=10, description="List of tag names")


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
    assets: List[AssetRead] = Field(default_factory=list, alias="images")
    # TODO: 現在のユーザーがこの投稿を「いいね」しているかどうかをサービス層で計算して設定する
    #       likes テーブルや like 機能実装後は、固定値ではなく実データで上書きされることを想定
    is_liked: bool = False

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
