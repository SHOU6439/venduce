from datetime import datetime, timezone


class FakeUser:
    """Lightweight fake user object used by FakeUserService in tests."""

    def __init__(self, email, username, first_name, last_name):
        self.email = email
        self.username = username
        self.first_name = first_name
        self.last_name = last_name
        self.id = 1
        self.created_at = datetime.now(timezone.utc)
