import pytest
from app.services.user_service import (
    user_service,
    UserAlreadyExists,
    ConfirmationError,
    RefreshTokenError,
    AuthenticationError,
)
from app.schemas.user import UserCreate
from app.utils.timezone import now_utc
from tests.factories import RefreshTokenFactory, UserFactory
from app.utils import jwt as jwt_utils


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
    user, token = user_service.create_provisional_user(db_session, user_in, expires_hours=-1)
    
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

    with pytest.raises(ConfirmationError):
        user_service.confirm_user(db_session, old_token)

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
    password = "password123"
    user = UserFactory(
        email="auth@example.com",
        username="authuser1",
        is_confirmed=True,
        is_active=True,
    )

    authenticated_user = user_service.authenticate_user(db_session, "auth@example.com", password)
    assert authenticated_user is not None
    assert authenticated_user.id == user.id


def test_authenticate_user_wrong_password(db_session):
    """Test authentication fails with wrong password."""
    user = UserFactory(
        email="wrongpass@example.com",
        username="wrongpassuser",
        is_confirmed=True,
        is_active=True,
    )

    authenticated_user = user_service.authenticate_user(db_session, "wrongpass@example.com", "wrongpassword")
    assert authenticated_user is None


def test_authenticate_user_nonexistent(db_session):
    """Test authentication fails for nonexistent user."""
    authenticated_user = user_service.authenticate_user(db_session, "does-not-exist@example.com", "anypassword")
    assert authenticated_user is None


def test_authenticate_user_inactive(db_session):
    """Test authentication fails for inactive user."""
    user = UserFactory(
        email="inactive@example.com",
        username="inactiveuser",
        is_confirmed=True,
        is_active=False,
    )
    
    authenticated_user = user_service.authenticate_user(db_session, "inactive@example.com", "password123")
    assert authenticated_user is None


def test_authenticate_and_issue_tokens_success(db_session):
    user = UserFactory(
        email="tokenlogin@example.com",
        username="tokenlogin",
        is_confirmed=True,
        is_active=True,
    )

    access_token, refresh_token, expires_in = user_service.authenticate_and_issue_tokens(
        db_session,
        "tokenlogin@example.com",
        "password123",
        remember=False,
    )

    assert isinstance(access_token, str) and access_token
    assert isinstance(refresh_token, str) and refresh_token
    assert isinstance(expires_in, int) and expires_in > 0


def test_authenticate_and_issue_tokens_not_confirmed(db_session):
    UserFactory(
        email="unconfirmed@example.com",
        username="unconfirmed",
        is_confirmed=False,
        is_active=True,
    )

    with pytest.raises(AuthenticationError) as exc_info:
        user_service.authenticate_and_issue_tokens(
            db_session,
            "unconfirmed@example.com",
            "password123",
            remember=False,
        )

    assert exc_info.value.code == "not_confirmed"
    assert exc_info.value.status_code == 403


def test_authenticate_and_issue_tokens_wrong_password(db_session):
    UserFactory(
        email="wrong@example.com",
        username="wronguser",
        is_confirmed=True,
        is_active=True,
    )

    with pytest.raises(AuthenticationError) as exc_info:
        user_service.authenticate_and_issue_tokens(
            db_session,
            "wrong@example.com",
            "invalid",
            remember=False,
        )

    assert exc_info.value.code == "invalid_credentials"


def test_save_refresh_token_success(db_session):
    """Test saving a refresh token in the database."""
    from app.models.refresh_token import RefreshToken
    from app.utils import jwt as jwt_utils
    
    user = UserFactory(
        email="refresh@example.com",
        username="refreshtoken",
        is_confirmed=True,
        is_active=True,
    )
    
    refresh_token, expires_at = jwt_utils.create_refresh_token(subject=str(user.id))
    db_refresh_token = user_service.save_refresh_token(db_session, str(user.id), refresh_token, expires_at)
    
    assert db_refresh_token.id is not None
    assert db_refresh_token.user_id == str(user.id)
    assert db_refresh_token.refresh_token == refresh_token
    assert db_refresh_token.expires_at == expires_at
    assert db_refresh_token.revoked_at is None
    assert db_refresh_token.created_at is not None


def test_rotate_refresh_token_success(db_session):
    """Test rotating refresh token rotates refresh token."""
    from app.models.refresh_token import RefreshToken
    from app.utils import jwt as jwt_utils
    
    user_in = UserCreate(
        email="tokenrefresh@example.com",
        username="tokenrefreshuser",
        password="password",
        first_name="Token",
        last_name="Refresh",
    )
    user, token = user_service.create_provisional_user(db_session, user_in)
    user_service.confirm_user(db_session, token)
    
    refresh_token, expires_at = jwt_utils.create_refresh_token(subject=str(user.id))
    user_service.save_refresh_token(db_session, str(user.id), refresh_token, expires_at)
    
    new_refresh_token = user_service.rotate_refresh_token(
        db_session,
        refresh_token,
        lambda ttl_days: jwt_utils.create_refresh_token(subject=str(user.id), ttl_days=ttl_days),
    )
    
    assert new_refresh_token is not None
    assert isinstance(new_refresh_token, str)
    assert new_refresh_token != refresh_token

    old_record = db_session.query(RefreshToken).filter(
        RefreshToken.refresh_token == refresh_token
    ).first()
    assert old_record.revoked_at is not None
    
    new_record = db_session.query(RefreshToken).filter(
        RefreshToken.refresh_token == new_refresh_token
    ).first()
    assert new_record is not None
    assert new_record.revoked_at is None


def test_rotate_refresh_token_invalid_token(db_session):
    """Test refresh with invalid token raises error."""
    
    user = UserFactory(
        email="invalidrefresh@example.com",
        username="invalidrefreshuser",
        is_confirmed=True,
        is_active=True,
    )
    
    with pytest.raises(RefreshTokenError):
        user_service.rotate_refresh_token(
            db_session,
            "invalid-token",
            lambda ttl_days: jwt_utils.create_refresh_token(subject=str(user.id), ttl_days=ttl_days),
        )


def test_rotate_refresh_token_revoked_token(db_session):
    """Test refresh with already revoked token raises error."""
    from app.utils import jwt as jwt_utils
    
    user = UserFactory(
        email="revokedrefresh@example.com",
        username="revokedrefreshuser",
        is_confirmed=True,
        is_active=True,
    )
    
    revoked_token = RefreshTokenFactory(user_id=str(user.id), revoked_at=now_utc())
    
    with pytest.raises(RefreshTokenError) as exc_info:
        user_service.rotate_refresh_token(
            db_session,
            revoked_token.refresh_token,
            lambda ttl_days: jwt_utils.create_refresh_token(subject=str(user.id), ttl_days=ttl_days),
        )
    assert "revoked" in str(exc_info.value).lower()
