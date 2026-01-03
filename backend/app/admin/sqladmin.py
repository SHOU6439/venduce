from typing import Sequence

from sqladmin import Admin, ModelView
from app.models import User, Product, RefreshToken, Asset
from app.db.database import engine


class UserAdmin(ModelView, model=User):
    column_list: Sequence[str] = ["id", "name", "email", "created_at"]


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


def setup_admin(app):
    admin = Admin(app, engine)
    admin.add_view(UserAdmin)
    admin.add_view(ProductAdmin)
    admin.add_view(RefreshTokenAdmin)
    admin.add_view(AssetAdmin)
