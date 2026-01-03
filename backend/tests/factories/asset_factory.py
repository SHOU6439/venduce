import factory
from ulid import ULID
from app.models.asset import Asset
from tests.factories.user import UserFactory


class AssetFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Asset
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(lambda: str(ULID()))
    owner_id = factory.LazyAttribute(lambda o: str(ULID()))

    purpose = "post_image"
    status = "ready"
    storage_key = factory.Sequence(lambda n: f"assets/image_{n}.jpg")
    content_type = "image/jpeg"
    extension = "jpg"
    size_bytes = 1024
    width = 800
    height = 600
    public_url = factory.LazyAttribute(lambda o: f"https://example.com/{o.storage_key}")
