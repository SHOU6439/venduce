from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import User
from admin import setup_admin

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


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/")
def read_root():
    return {"message": "Hello from FastAPI"}
