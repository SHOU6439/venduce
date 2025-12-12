# routers package
from . import auth
from . import users
from . import uploads
from . import admin_products
from . import admin_categories
from . import admin_brands
from . import categories
from . import brands

__all__ = ["auth", "users", "uploads", "admin_products", "admin_categories", "admin_brands", "categories", "brands"]
