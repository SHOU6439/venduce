import pytest
from app.db.database import Base
from app.services.user_service import user_service, UserAlreadyExists
from app.schemas.user import UserCreate


def test_create_user_success(db_session):
    user_in = UserCreate(
        email="test@example.com",
        username="tester",
        password="strongpassword",
        first_name="Taro",
        last_name="Yamada",
    )
    user, token = user_service.create_provisional_user(db_session, user_in)
    assert user.id is not None
    assert isinstance(token, str) and token
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
    user_service.create_provisional_user(db_session, user_in)
    with pytest.raises(UserAlreadyExists):
        user_service.create_provisional_user(db_session, user_in)
