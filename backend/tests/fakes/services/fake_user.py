from datetime import timezone
from app.utils.timezone import now_utc


class FakeUser:
    """Lightweight fake user object used by FakeUserService in tests."""

    def __init__(self, email, username, first_name, last_name):
        self.email = email
        self.username = username
        self.first_name = first_name
        self.last_name = last_name
        self.id = "fake-ulid-123456789012"
        self.created_at = now_utc()
