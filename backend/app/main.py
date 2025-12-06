from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from app.admin.sqladmin import setup_admin
from app.api.routers import auth as auth_router
from app.api.routers import users as users_router
from app.core.config import settings

app = FastAPI(swagger_ui_parameters={"persistAuthorization": True})

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
app.include_router(users_router.router, prefix="/api/users", tags=["users"])

@app.get("/api/health")
def health_check():
    return {"status": "ok"}


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=settings.API_TITLE,
        version=settings.API_VERSION,
        description=settings.API_DESCRIPTION,
        routes=app.routes,
    )
    if "components" not in openapi_schema:
        openapi_schema["components"] = {}
    if "securitySchemes" not in openapi_schema["components"]:
        openapi_schema["components"]["securitySchemes"] = {}

    openapi_schema["components"]["securitySchemes"]["OAuth2PasswordBearer"] = {
        "type": "oauth2",
        "flows": {
            "password": {
                "tokenUrl": "/api/auth/token",
                "scopes": {
                    "remember": "Request refresh token with remember-me TTL",
                },
            }
        },
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi
