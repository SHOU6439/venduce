import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.services.user_service import create_user, UserAlreadyExists
from app.schemas.user import UserCreate


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    TestingSessionLocal = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_create_user_success(db_session):
    user_in = UserCreate(
        email="test@example.com",
        username="tester",
        password="strongpassword",
        first_name="Taro",
        last_name="Yamada",
    )
    user = create_user(db_session, user_in)
    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.username == "tester"
    assert user.first_name == "Taro"
    assert user.last_name == "Yamada"
    assert user.created_at is not None
    assert hasattr(user, "password_hash") and user.password_hash


def test_create_user_duplicate(db_session):
    user_in = UserCreate(
        email="dup@example.com",
        username="dupuser",
        password="strongpassword",
        first_name="Han",
        last_name="Ko",
    )
    create_user(db_session, user_in)
    with pytest.raises(UserAlreadyExists):
        create_user(db_session, user_in)
