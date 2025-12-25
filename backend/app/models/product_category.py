from sqlalchemy import Column, String, ForeignKey, Table
from app.db.database import Base

product_categories = Table(
    "product_categories",
    Base.metadata,
    Column("product_id", String(26), ForeignKey("products.id"), primary_key=True),
    Column("category_id", String(26), ForeignKey("categories.id"), primary_key=True),
)

__all__ = ["product_categories"]
