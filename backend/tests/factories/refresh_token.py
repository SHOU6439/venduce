"""Factory for creating RefreshToken model instances."""

import factory
from datetime import timedelta
from ulid import ULID

from app.models.refresh_token import RefreshToken
from app.utils.timezone import now_utc
from tests.factories.user import UserFactory


class RefreshTokenFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Factory for creating RefreshToken instances.
    
    Usage:
        user = UserFactory()
        refresh_token = RefreshTokenFactory(user=user)
    """

    class Meta:
        model = RefreshToken
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(lambda: str(ULID()))
    user = factory.SubFactory(UserFactory)
    token = factory.Faker("sha256")
    created_at = factory.LazyFunction(now_utc)
    expires_at = factory.LazyFunction(lambda: now_utc() + timedelta(days=7))
    revoked = False


__all__ = ["RefreshTokenFactory"]
