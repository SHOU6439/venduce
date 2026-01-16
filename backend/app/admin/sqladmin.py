from sqladmin import Admin, ModelView
from sqlalchemy import inspect
from app.db.database import engine
import app.models


def setup_admin(application):
    admin = Admin(application, engine, title="Venduce")

    model_names = getattr(app.models, "__all__", [])

    for name in model_names:
        model_cls = getattr(app.models, name)

        if not hasattr(model_cls, "__mapper__") or not hasattr(model_cls, "__tablename__"):
            continue

        try:
            mapper = inspect(model_cls)
            columns = [c.key for c in mapper.columns]
        except Exception:
            columns = []

        class DynamicAdmin(ModelView, model=model_cls):
            column_list = columns
            icon = "fa-solid fa-table"
            name_plural = f"{name}s"

        DynamicAdmin.__name__ = f"{name}Admin"
        DynamicAdmin.name = name

        admin.add_view(DynamicAdmin)
