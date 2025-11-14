import pytest
from datetime import timedelta
from app.db.database import Base
from app.services.user_service import user_service, UserAlreadyExists, ConfirmationError
from app.schemas.user import UserCreate
from app.utils.timezone import now_utc


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
    assert user.is_confirmed is False
    assert user.is_active is False
    assert user.confirmation_token == token
    assert user.confirmation_sent_at is not None
    assert user.confirmation_expires_at is not None


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


def test_create_user_duplicate_email(db_session):
    """Test duplicate email raises error."""
    user_in1 = UserCreate(
        email="unique@example.com",
        username="user111111",
        password="password1",
        first_name="User",
        last_name="One",
    )
    user_service.create_provisional_user(db_session, user_in1)

    user_in2 = UserCreate(
        email="unique@example.com",
        username="user222222",
        password="password2",
        first_name="User",
        last_name="Two",
    )
    with pytest.raises(UserAlreadyExists):
        user_service.create_provisional_user(db_session, user_in2)


def test_create_user_duplicate_username(db_session):
    """Test duplicate username raises error."""
    user_in1 = UserCreate(
        email="email1@example.com",
        username="sameusername",
        password="password1",
        first_name="User",
        last_name="One",
    )
    user_service.create_provisional_user(db_session, user_in1)

    user_in2 = UserCreate(
        email="email2@example.com",
        username="sameusername",
        password="password2",
        first_name="User",
        last_name="Two",
    )
    with pytest.raises(UserAlreadyExists):
        user_service.create_provisional_user(db_session, user_in2)


def test_confirm_user_success(db_session):
    """Test confirming a user works correctly."""
    user_in = UserCreate(
        email="confirm@example.com",
        username="confirmuser",
        password="password",
        first_name="Confirm",
        last_name="User",
    )
    user, token = user_service.create_provisional_user(db_session, user_in)
    assert user.is_confirmed is False
    assert user.is_active is False

    confirmed_user = user_service.confirm_user(db_session, token)
    assert confirmed_user.is_confirmed is True
    assert confirmed_user.is_active is True
    assert confirmed_user.confirmation_token is None
    assert confirmed_user.confirmation_sent_at is None
    assert confirmed_user.confirmation_expires_at is None


def test_confirm_invalid_token(db_session):
    """Test confirming with invalid token raises error."""
    with pytest.raises(ConfirmationError) as exc_info:
        user_service.confirm_user(db_session, "invalid-token")
    assert "invalid token" in str(exc_info.value)


def test_confirm_expired_token(db_session):
    """Test confirming with expired token raises error."""
    user_in = UserCreate(
        email="expired@example.com",
        username="expireduser",
        password="password",
        first_name="Expired",
        last_name="User",
    )
    user, token = user_service.create_provisional_user(db_session, user_in, expires_hours=-1)  # Already expired
    
    with pytest.raises(ConfirmationError) as exc_info:
        user_service.confirm_user(db_session, token)
    assert "token expired" in str(exc_info.value)


def test_resend_confirmation_success(db_session):
    """Test resending confirmation to unconfirmed user."""
    user_in = UserCreate(
        email="resend@example.com",
        username="resenduser",
        password="password",
        first_name="Resend",
        last_name="User",
    )
    user, old_token = user_service.create_provisional_user(db_session, user_in)

    new_token = user_service.resend_confirmation(db_session, "resend@example.com")
    assert new_token != old_token
    assert isinstance(new_token, str) and new_token

    # Old token should no longer work
    with pytest.raises(ConfirmationError):
        user_service.confirm_user(db_session, old_token)

    # New token should work
    confirmed_user = user_service.confirm_user(db_session, new_token)
    assert confirmed_user.is_confirmed is True


def test_resend_confirmation_already_confirmed(db_session):
    """Test resending confirmation to already confirmed user raises error."""
    user_in = UserCreate(
        email="already@example.com",
        username="alreadyuser",
        password="password",
        first_name="Already",
        last_name="Confirmed",
    )
    user, token = user_service.create_provisional_user(db_session, user_in)
    user_service.confirm_user(db_session, token)

    with pytest.raises(ConfirmationError) as exc_info:
        user_service.resend_confirmation(db_session, "already@example.com")
    assert "already confirmed" in str(exc_info.value)


def test_resend_confirmation_nonexistent_user(db_session):
    """Test resending confirmation to nonexistent user raises error."""
    with pytest.raises(ConfirmationError) as exc_info:
        user_service.resend_confirmation(db_session, "does-not-exist@example.com")
    assert "user not found" in str(exc_info.value)


def test_get_user_by_email(db_session):
    """Test retrieving user by email."""
    user_in = UserCreate(
        email="getuser@example.com",
        username="getuser123",
        password="password",
        first_name="Get",
        last_name="User",
    )
    created_user, _ = user_service.create_provisional_user(db_session, user_in)

    retrieved_user = user_service.get_user_by_email(db_session, "getuser@example.com")
    assert retrieved_user is not None
    assert retrieved_user.id == created_user.id
    assert retrieved_user.email == "getuser@example.com"


def test_get_user_by_email_nonexistent(db_session):
    """Test retrieving nonexistent user returns None."""
    user = user_service.get_user_by_email(db_session, "does-not-exist@example.com")
    assert user is None


def test_authenticate_user_success(db_session):
    """Test authenticating user with correct credentials."""
    password = "correctpassword"
    user_in = UserCreate(
        email="auth@example.com",
        username="authuser1",
        password=password,
        first_name="Auth",
        last_name="User",
    )
    created_user, token = user_service.create_provisional_user(db_session, user_in)
    user_service.confirm_user(db_session, token)

    authenticated_user = user_service.authenticate_user(db_session, "auth@example.com", password)
    assert authenticated_user is not None
    assert authenticated_user.id == created_user.id


def test_authenticate_user_wrong_password(db_session):
    """Test authentication fails with wrong password."""
    user_in = UserCreate(
        email="wrongpass@example.com",
        username="wrongpassuser",
        password="correctpassword",
        first_name="Wrong",
        last_name="Pass",
    )
    created_user, token = user_service.create_provisional_user(db_session, user_in)
    user_service.confirm_user(db_session, token)

    authenticated_user = user_service.authenticate_user(db_session, "wrongpass@example.com", "wrongpassword")
    assert authenticated_user is None


def test_authenticate_user_nonexistent(db_session):
    """Test authentication fails for nonexistent user."""
    authenticated_user = user_service.authenticate_user(db_session, "does-not-exist@example.com", "anypassword")
    assert authenticated_user is None


def test_authenticate_user_inactive(db_session):
    """Test authentication fails for inactive user."""
    user_in = UserCreate(
        email="inactive@example.com",
        username="inactiveuser",
        password="password",
        first_name="Inactive",
        last_name="User",
    )
    created_user, _ = user_service.create_provisional_user(db_session, user_in)
    
    authenticated_user = user_service.authenticate_user(db_session, "inactive@example.com", "password")
    assert authenticated_user is None
