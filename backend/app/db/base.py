from .database import Base

# Provide target_metadata for Alembic's autogenerate
target_metadata = Base.metadata
