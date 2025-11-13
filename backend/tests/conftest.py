import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os

import smtplib


class _DummySMTP:
    def __init__(self, *args, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def login(self, *args, **kwargs):
        return None

    def send_message(self, *args, **kwargs):
        return None

smtplib.SMTP = _DummySMTP

from app.db.database import Base, get_db
from app.main import app
from app.deps import get_user_service
from tests.fakes.services.fake_user_service import FakeUserService


# Use PostgreSQL for tests (same as production)
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://pride_user:pride_password@postgres:5432/pride_db_test"
)

_engine = create_engine(
    TEST_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)

# Create test database schema
Base.metadata.drop_all(bind=_engine)
Base.metadata.create_all(bind=_engine)

TestingSessionLocal = sessionmaker(bind=_engine)


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
        # Clean up: drop and recreate all tables after each test
        Base.metadata.drop_all(bind=_engine)
        Base.metadata.create_all(bind=_engine)


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
