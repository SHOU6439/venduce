from tests.fakes.services.fake_user import FakeUser
from app.services.user_service import UserAlreadyExists


class FakeUserService:
    """A tiny in-memory fake used by API tests to demonstrate DI.

    - Stores users by email in memory
    - Returns a simple token string mapped to the user
    - Implements the subset of the real UserService API used by tests:
      `create_provisional_user(db, user_in, expires_hours)`, `confirm_user(db, token)`,
      `resend_confirmation(db, email, expires_hours)`
    """

    def __init__(self):
        self.users = {}
        self.tokens = {}

    def create_provisional_user(self, db, user_in, expires_hours=24):
        if user_in.email in self.users or user_in.username in (
            u.username for u in self.users.values()
        ):
            raise UserAlreadyExists("email or username already exists")
        fake = FakeUser(user_in.email, user_in.username, user_in.first_name, user_in.last_name)
        token = f"fake-token-{len(self.tokens) + 1}"
        self.users[user_in.email] = fake
        self.tokens[token] = fake
        return fake, token

    def confirm_user(self, db, token):
        if token not in self.tokens:
            raise Exception("invalid token")
        return self.tokens[token]

    def resend_confirmation(self, db, email, expires_hours=24):
        if email not in self.users:
            raise Exception("not found")
        return "resent-token-456"
