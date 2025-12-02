import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from tests.factories import UserFactory, RefreshTokenFactory

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
from tests.factories import UserFactory
from app.core.config import settings


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
        UserFactory._meta.sqlalchemy_session = db
        RefreshTokenFactory._meta.sqlalchemy_session = db
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def mock_jwt_settings(monkeypatch):
    """
    テスト用にJWT設定をオーバーライド
    ファイルシステムへの依存を排除するため、HS256とダミーキーを使用
    """
    monkeypatch.setattr(settings, "JWT_ALGORITHM", "HS256")
    monkeypatch.setattr(settings, "JWT_SECRET_KEY", "test-secret-key-for-unit-tests")
    monkeypatch.setattr(settings, "JWT_PRIVATE_KEY_PATH", None)
    monkeypatch.setattr(settings, "JWT_PUBLIC_KEY_PATH", None)
    monkeypatch.setattr(settings, "JWT_PRIVATE_KEY", None)
    monkeypatch.setattr(settings, "JWT_PUBLIC_KEY", None)


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
def client():
    """TestClient for API testing.

    The database is automatically cleaned up before and after each test via
    the autouse override_db fixture.
    """
    return TestClient(app)
