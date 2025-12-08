from __future__ import annotations

from enum import Enum


class AssetPurpose(str, Enum):
    AVATAR = "avatar"
    POST_IMAGE = "post_image"
    PRODUCT_IMAGE = "product_image"


__all__ = ["AssetPurpose"]
