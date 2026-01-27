import factory
from ulid import ULID
from app.models.tag import Tag


class TagFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Tag
        sqlalchemy_session = None
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(lambda: str(ULID()))
    name = factory.Faker("word")
    usage_count = 0
