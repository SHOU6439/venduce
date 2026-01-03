from __future__ import annotations

from enum import Enum


class AssetPurpose(str, Enum):
    AVATAR = "avatar"
    POST_IMAGE = "post_image"
    PRODUCT_IMAGE = "product_image"


class ProductStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class PostStatus(str, Enum):
    DRAFT = "draft"
    PUBLIC = "public"
    ARCHIVED = "archived"


__all__ = ["AssetPurpose", "ProductStatus", "PostStatus"]
