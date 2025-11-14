from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.admin.sqladmin import setup_admin
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
