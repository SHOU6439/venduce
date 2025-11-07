from typing import Generator

from app.services.user_service import user_service, UserService


def get_user_service() -> UserService:
    """Dependency provider for UserService. Can be overridden in tests."""
    return user_service
