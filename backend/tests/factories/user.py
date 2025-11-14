"""Factory for creating User model instances."""

import factory
from ulid import ULID

from app.models.user import User
from app.utils.timezone import now_utc
from app.core.security import hash_password


class UserFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Factory for creating User instances.
    
    Usage:
        user = UserFactory(email="test@example.com", is_confirmed=True)
    """

    class Meta:
        model = User
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(lambda: str(ULID()))
    email = factory.Faker("email")
    username = factory.Faker("username")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    password_hash = factory.LazyFunction(lambda: hash_password("password123"))
    created_at = factory.LazyFunction(now_utc)
    is_active = True
    is_confirmed = True
    confirmation_token = None
    confirmation_sent_at = None
    confirmation_expires_at = None


__all__ = ["UserFactory"]
