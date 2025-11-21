"""Factory for creating RefreshToken model instances."""

import factory
from datetime import timedelta
from ulid import ULID

from app.models.refresh_token import RefreshToken
from app.utils.timezone import now_utc


class RefreshTokenFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Factory for creating RefreshToken instances.
    
    Usage:
        refresh_token = RefreshTokenFactory(user_id=str(user.id))
        revoked_token = RefreshTokenFactory(user_id=str(user.id), revoked_at=now_utc())
    """

    class Meta:
        model = RefreshToken
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(lambda: str(ULID()))
    user_id = None
    refresh_token = factory.Faker("sha256")
    device_id = None
    ip_address = None
    user_agent = None
    created_at = factory.LazyFunction(now_utc)
    last_used_at = None
    expires_at = factory.LazyFunction(lambda: now_utc() + timedelta(days=7))
    revoked_at = None


__all__ = ["RefreshTokenFactory"]
