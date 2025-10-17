from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from models import User
from admin import setup_admin

# テーブル作成
Base.metadata.create_all(bind=engine)

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
setup_admin(app)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/")
def read_root():
    return {"message": "Hello from FastAPI"}