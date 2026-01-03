from sqlalchemy import Column, String, ForeignKey
from app.db.database import Base

class ProductCategory(Base):
    __tablename__ = "product_categories"

    product_id = Column(String(26), ForeignKey("products.id"), primary_key=True)
    category_id = Column(String(26), ForeignKey("categories.id"), primary_key=True)

__all__ = ["ProductCategory"]
