from sqladmin import Admin, ModelView
from models import User
from database import engine


class UserAdmin(ModelView, model=User):
    column_list = [User.id, User.name, User.email, User.created_at]
    column_details_list = [User.id, User.name, User.email, User.created_at]
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-user"


def setup_admin(app):
    admin = Admin(app, engine)
    admin.add_view(UserAdmin)