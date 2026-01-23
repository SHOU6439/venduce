from __future__ import annotations

from enum import Enum


class AssetPurpose(str, Enum):
    AVATAR = "avatar"
    POST_IMAGE = "post_image"
    PRODUCT_IMAGE = "product_image"
    CATEGORY_IMAGE = "category_image"
    BRAND_IMAGE = "brand_image"


class ProductStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class PostStatus(str, Enum):
    DRAFT = "draft"
    PUBLIC = "public"
    ARCHIVED = "archived"


class PaymentType(str, Enum):
    CREDIT_CARD = "credit_card"
    CONVENIENCE_STORE = "convenience_store"
    BANK_TRANSFER = "bank_transfer"
    DIGITAL_WALLET = "digital_wallet"


class PurchaseStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    REFUNDED = "refunded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


__all__ = ["AssetPurpose", "ProductStatus", "PostStatus", "PaymentType", "PurchaseStatus"]
