from app.services.user_service import UserAlreadyExists, ConfirmationError
from app.utils.timezone import now_utc
from app.core.security import hash_password, verify_password
from datetime import timedelta


class FakeUser:
    """Lightweight in-memory mock user object for testing."""

    def __init__(self, email, username, first_name, last_name, password_hash, **kwargs):
        self.id = kwargs.get("id", "mock-ulid-123456789012")
        self.email = email
        self.username = username
        self.first_name = first_name
        self.last_name = last_name
        self.password_hash = password_hash
        self.is_confirmed = kwargs.get("is_confirmed", False)
        self.is_active = kwargs.get("is_active", False)
        self.confirmation_token = kwargs.get("confirmation_token")
        self.confirmation_sent_at = kwargs.get("confirmation_sent_at")
        self.confirmation_expires_at = kwargs.get("confirmation_expires_at")
        self.created_at = kwargs.get("created_at", now_utc())


class FakeUserService:
    """A mock UserService that stores users in memory (not in the database).

    This is pure mocking - no DB writes. Useful for isolated unit tests of auth endpoints.
    For integration tests that need DB persistence, use factories with conftest's db_session.
    """

    def __init__(self):
        self.users = {}  # email -> FakeUser
        self.tokens = {}  # token -> FakeUser

    def create_provisional_user(self, db, user_in, expires_hours=24):
        """Create a provisional user in memory (not saved to DB)."""
        # Check for existing email/username in memory
        if any(u.email == user_in.email or u.username == user_in.username 
               for u in self.users.values()):
            raise UserAlreadyExists("email or username already exists")
        
        token = f"fake-token-{len(self.tokens) + 1}"
        now = now_utc()
        
        user = FakeUser(
            email=user_in.email,
            username=user_in.username,
            first_name=user_in.first_name,
            last_name=user_in.last_name,
            password_hash=hash_password(user_in.password),
            is_confirmed=False,
            is_active=False,
            confirmation_token=token,
            confirmation_sent_at=now,
            confirmation_expires_at=now + timedelta(hours=expires_hours),
        )
        
        self.users[user_in.email] = user
        self.tokens[token] = user
        return user, token

    def confirm_user(self, db, token):
        """Confirm a user by token (memory only)."""
        if token not in self.tokens:
            raise ConfirmationError("invalid token")
        
        user = self.tokens[token]
        now = now_utc()
        if user.confirmation_expires_at and user.confirmation_expires_at < now:
            raise ConfirmationError("token expired")
        
        user.is_confirmed = True
        user.is_active = True
        user.confirmation_token = None
        user.confirmation_sent_at = None
        user.confirmation_expires_at = None
        return user

    def resend_confirmation(self, db, email, expires_hours=24):
        """Resend confirmation token (memory only)."""
        user = self.users.get(email)
        if not user or user.is_confirmed:
            raise ConfirmationError("user not found or already confirmed")
        
        new_token = f"resent-token-{len(self.tokens) + 1}"
        now = now_utc()
        user.confirmation_token = new_token
        user.confirmation_sent_at = now
        user.confirmation_expires_at = now + timedelta(hours=expires_hours)
        
        self.tokens[new_token] = user
        return new_token

    def get_user_by_email(self, db, email):
        """Return user by email or None (memory only)."""
        return self.users.get(email)

    def authenticate_user(self, db, email, password):
        """Verify user credentials (memory only)."""
        user = self.users.get(email)
        if not user:
            return None
        if not user.is_active:
            return None
        # Verify password
        if not verify_password(password, user.password_hash):
            return None
        return user
