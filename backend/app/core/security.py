"""
Security utilities: password hashing, JWT handling, etc.
"""

from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(
    schemes=["argon2", "pbkdf2_sha256"],
    default="argon2",
    deprecated="auto",
    argon2__time_cost=settings.ARGON2_TIME_COST,
    argon2__memory_cost=settings.ARGON2_MEMORY_COST,
    argon2__parallelism=settings.ARGON2_PARALLELISM,
)


def hash_password(password: str) -> str:
    """Hash a password using the configured password context."""
    return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(password, hashed_password)


__all__ = ["pwd_context", "hash_password", "verify_password"]
