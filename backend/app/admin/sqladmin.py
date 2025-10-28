from typing import Sequence

from sqladmin import Admin, ModelView
from app.models import User
from app.db.database import engine


class UserAdmin(ModelView, model=User):
    column_list: Sequence[str] = ["id", "name", "email", "created_at"]


def setup_admin(app):
    admin = Admin(app, engine)
    admin.add_view(UserAdmin)
