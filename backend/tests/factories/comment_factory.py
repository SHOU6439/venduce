"""Factory for creating Comment model instances."""
import factory
from ulid import ULID

from app.models.comment import Comment
from app.utils.timezone import now_utc


class CommentFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Comment
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(lambda: str(ULID()))
    content = factory.Faker("text")
    parent_comment_id = None
    post_id = None
    user_id = None
    created_at = factory.LazyFunction(now_utc)
    updated_at = factory.LazyFunction(now_utc)
    is_deleted = False
