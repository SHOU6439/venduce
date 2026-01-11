"""Factory for creating Post model instances."""
import factory
from ulid import ULID

from app.models.post import Post
from app.models.enums import PostStatus
from app.utils.timezone import now_utc


class PostFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Factory for creating Post instances.

    Usage:
        post = PostFactory(user_id=user.id, status=PostStatus.PUBLIC)
    """

    class Meta:
        model = Post
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(lambda: str(ULID()))
    user_id = None  # Must be provided
    caption = factory.Faker("sentence")
    status = PostStatus.PUBLIC
    purchase_count = 0
    view_count = 0
    like_count = 0
    extra_metadata = None
    created_at = factory.LazyFunction(now_utc)
    updated_at = factory.LazyFunction(now_utc)


__all__ = ["PostFactory"]
