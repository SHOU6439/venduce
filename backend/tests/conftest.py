import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.main import app
from app.deps import get_user_service
from tests.fakes.services.fake_user_service import FakeUserService


# Shared in-memory SQLite engine for tests that need DB access across requests.
# Using StaticPool keeps the in-memory DB alive across connections/threads used by TestClient.
_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=_engine)
Base.metadata.create_all(bind=_engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def db_session():
    """Provide a DB session for service/unit tests that need direct DB access."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def override_db():
    """Automatically override `get_db` for tests and remove the override afterwards."""
    app.dependency_overrides[get_db] = _override_get_db
    try:
        yield
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def fake_user_service():
    """Provide a fresh FakeUserService instance to tests.

    Tests that need to inspect/drive the fake can accept this fixture. By default
    it is not auto-applied, but the `client` fixture below will install it.
    """
    return FakeUserService()


@pytest.fixture
def client(fake_user_service):
    """TestClient that installs a FakeUserService as the `get_user_service` dependency.

    Yields a TestClient with the dependency override in place and ensures the override
    is removed after the test.
    """
    app.dependency_overrides[get_user_service] = lambda: fake_user_service
    client = TestClient(app)
    try:
        yield client
    finally:
        app.dependency_overrides.pop(get_user_service, None)
