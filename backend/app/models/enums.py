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


class BadgeCategory(str, Enum):
    """バッジのカテゴリ（評価基準）。"""
    DRIVEN_PURCHASES = "driven_purchases"   # 投稿経由の購入貢献数
    POSTS = "posts"                         # 投稿数
    LIKES_RECEIVED = "likes_received"       # 受け取ったいいね数
    FOLLOWERS = "followers"                 # フォロワー数
    PURCHASES_MADE = "purchases_made"       # 自分の購入数
    FIRST_ACTION = "first_action"           # 初アクション（threshold=1）


class NotificationType(str, Enum):
    """通知の種類。"""
    LIKE = "like"                           # いいねされた
    FOLLOW = "follow"                       # フォローされた
    COMMENT = "comment"                     # コメントされた
    PURCHASE = "purchase"                   # 投稿経由で商品が購入された
    RANKING = "ranking"                     # ランキングにランクインした


__all__ = ["AssetPurpose", "ProductStatus", "PostStatus", "PaymentType", "PurchaseStatus", "BadgeCategory", "NotificationType"]
