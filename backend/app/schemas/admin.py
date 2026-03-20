"""管理者用 Pydantic スキーマ。"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import ConfigDict, EmailStr, Field

from app.schemas.base import AppModel
from app.schemas.asset import AssetRead
from app.models.enums import ProductStatus


# ═══════════════════════════════════════════════════════════
# 共通
# ═══════════════════════════════════════════════════════════

class AdminPaginatedResponse(AppModel):
    items: list
    total: int
    page: int
    per_page: int
    total_pages: int


# ═══════════════════════════════════════════════════════════
# ダッシュボード
# ═══════════════════════════════════════════════════════════

class DashboardStats(AppModel):
    total_users: int
    total_products: int
    total_posts: int
    total_categories: int
    total_brands: int
    total_purchases: int


# ═══════════════════════════════════════════════════════════
# ユーザー管理
# ═══════════════════════════════════════════════════════════

class AdminUserRead(AppModel):
    id: str
    email: str
    username: str
    first_name: str
    last_name: str
    bio: Optional[str] = None
    avatar_asset: Optional[AssetRead] = None
    is_active: bool
    is_confirmed: bool
    is_admin: bool
    is_purchase_history_public: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminUserUpdate(AppModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    bio: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class AdminUserListResponse(AppModel):
    items: List[AdminUserRead]
    total: int
    page: int
    per_page: int
    total_pages: int


# ═══════════════════════════════════════════════════════════
# 商品管理
# ═══════════════════════════════════════════════════════════

class AdminAssetInfo(AppModel):
    id: str
    public_url: Optional[str] = None
    content_type: str = ""

    model_config = ConfigDict(from_attributes=True)


class AdminProductRead(AppModel):
    id: str
    title: str
    sku: str
    description: Optional[str] = None
    price_cents: int
    currency: str
    stock_quantity: int
    status: str
    brand_id: Optional[str] = None
    images: List[AdminAssetInfo] = []
    category_ids: List[str] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AdminProductCreate(AppModel):
    title: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=64)
    description: Optional[str] = None
    price_cents: int = Field(..., ge=1)
    currency: str = Field(default="JPY", min_length=3, max_length=8)
    stock_quantity: int = Field(default=1, ge=0)
    status: ProductStatus = Field(default=ProductStatus.DRAFT)
    brand_id: Optional[str] = None
    category_ids: List[str] = Field(default_factory=list)
    asset_ids: List[str] = Field(default_factory=list)


class AdminProductUpdate(AppModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price_cents: Optional[int] = Field(None, ge=0)
    stock_quantity: Optional[int] = Field(None, ge=0)
    status: Optional[ProductStatus] = None
    brand_id: Optional[str] = None
    category_ids: Optional[List[str]] = None
    asset_ids: Optional[List[str]] = None


class AdminProductListResponse(AppModel):
    items: List[AdminProductRead]
    total: int
    page: int
    per_page: int
    total_pages: int


# ═══════════════════════════════════════════════════════════
# カテゴリ管理
# ═══════════════════════════════════════════════════════════

class AdminCategoryRead(AppModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    parent_id: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AdminCategoryCreate(AppModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: Optional[str] = Field(None, min_length=1, max_length=128)
    description: Optional[str] = None
    parent_id: Optional[str] = None
    is_active: bool = True


class AdminCategoryUpdate(AppModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None
    is_active: Optional[bool] = None


class AdminCategoryListResponse(AppModel):
    items: List[AdminCategoryRead]
    total: int
    page: int
    per_page: int
    total_pages: int


# ═══════════════════════════════════════════════════════════
# ブランド管理
# ═══════════════════════════════════════════════════════════

class AdminBrandRead(AppModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AdminBrandCreate(AppModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: Optional[str] = Field(None, min_length=1, max_length=128)
    description: Optional[str] = None
    is_active: bool = True


class AdminBrandUpdate(AppModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class AdminBrandListResponse(AppModel):
    items: List[AdminBrandRead]
    total: int
    page: int
    per_page: int
    total_pages: int


# ═══════════════════════════════════════════════════════════
# 投稿管理
# ═══════════════════════════════════════════════════════════

class AdminPostRead(AppModel):
    id: str
    user_id: str
    username: Optional[str] = None
    caption: Optional[str] = None
    status: str
    purchase_count: int
    view_count: int
    like_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AdminPostUpdate(AppModel):
    caption: Optional[str] = None
    status: Optional[str] = None


class AdminPostListResponse(AppModel):
    items: List[AdminPostRead]
    total: int
    page: int
    per_page: int
    total_pages: int


# ═══════════════════════════════════════════════════════════
# 購入管理
# ═══════════════════════════════════════════════════════════

class AdminPurchaseRead(AppModel):
    id: str
    buyer_id: str
    buyer_username: Optional[str] = None
    product_id: str
    product_title: Optional[str] = None
    quantity: int
    price_cents: int
    total_amount_cents: int
    currency: str
    status: str
    referring_post_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AdminPurchaseUpdate(AppModel):
    status: Optional[str] = None
    quantity: Optional[int] = Field(None, ge=1)


class AdminPurchaseListResponse(AppModel):
    items: List[AdminPurchaseRead]
    total: int
    page: int
    per_page: int
    total_pages: int


__all__ = [
    "AdminPaginatedResponse",
    "DashboardStats",
    "AdminUserRead",
    "AdminUserUpdate",
    "AdminUserListResponse",
    "AdminAssetInfo",
    "AdminProductRead",
    "AdminProductCreate",
    "AdminProductUpdate",
    "AdminProductListResponse",
    "AdminCategoryRead",
    "AdminCategoryCreate",
    "AdminCategoryUpdate",
    "AdminCategoryListResponse",
    "AdminBrandRead",
    "AdminBrandCreate",
    "AdminBrandUpdate",
    "AdminBrandListResponse",
    "AdminPostRead",
    "AdminPostUpdate",
    "AdminPostListResponse",
    "AdminPurchaseRead",
    "AdminPurchaseUpdate",
    "AdminPurchaseListResponse",
]
