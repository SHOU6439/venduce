from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.models import User
from app.admin.sqladmin import setup_admin
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.utils.timezone import to_jst
from app.api.routers import auth as auth_router

app = FastAPI()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQLAdmin セットアップ
try:
    setup_admin(app)
except Exception as e:
    print(f"SQLAdmin setup error: {e}")

app.include_router(auth_router.router)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/")
def read_root():
    return {"message": "Hello from FastAPI"}


@app.get("/api/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Example endpoint that returns a user and converts created_at to JST.

    This is a minimal, illustrative endpoint for developers: it queries the
    User model, converts the stored UTC timestamp to JST using the helper
    in `backend/app/utils/timezone.py`, and returns an ISO-8601 string.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    created_at_jst = None
    if getattr(user, "created_at", None) is not None:
        created_at_jst = to_jst(user.created_at)

    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "created_at": created_at_jst.isoformat() if created_at_jst is not None else None,
    }
