from typing import Sequence

from sqladmin import Admin, ModelView
from app.models import User, Product
from app.db.database import engine


class UserAdmin(ModelView, model=User):
    column_list: Sequence[str] = ["id", "name", "email", "created_at"]

class ProductAdmin(ModelView, model=Product):
    column_list = ["id", "title", "sku", "price_cents", "currency", "stock_quantity", "status"]


def setup_admin(app):
    admin = Admin(app, engine)
    admin.add_view(UserAdmin)
    admin.add_view(ProductAdmin)
