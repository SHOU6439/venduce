from typing import Sequence

from sqladmin import Admin, ModelView
from app.models import User, Product, RefreshToken, Asset, Post
from app.db.database import engine


class UserAdmin(ModelView, model=User):
    column_list: Sequence[str] = ["id", "username", "email", "is_active", "is_admin", "created_at"]


class ProductAdmin(ModelView, model=Product):
    column_list = ["id", "title", "sku", "price_cents", "currency", "stock_quantity", "status"]


class RefreshTokenAdmin(ModelView, model=RefreshToken):
    column_list = [
        "id",
        "user_id",
        "created_at",
        "expires_at",
        "revoked_at",
        "ip_address",
        "last_used_at",
    ]


class AssetAdmin(ModelView, model=Asset):
    column_list = [
        "id",
        "owner_id",
        "purpose",
        "status",
        "content_type",
        "size_bytes",
        "created_at",
        "public_url",
    ]


class PostAdmin(ModelView, model=Post):
    column_list = [
        "id",
        "user_id",
        "status",
        "created_at",
        "updated_at",
        "like_count",
        "purchase_count",
        "view_count",
    ]


def setup_admin(app):
    admin = Admin(app, engine)
    admin.add_view(UserAdmin)
    admin.add_view(ProductAdmin)
    admin.add_view(RefreshTokenAdmin)
    admin.add_view(AssetAdmin)
    admin.add_view(PostAdmin)
