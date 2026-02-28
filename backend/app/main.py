from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from app.admin.sqladmin import setup_admin
from app.api.routers import auth, products
from app.api.routers import users as users_router
from app.api.routers import uploads as uploads_router
from app.api.routers import posts as posts_router
from app.api.routers import admin_products as admin_products_router
from app.api.routers import admin_categories as admin_categories_router
from app.api.routers import admin_brands as admin_brands_router
from app.api.routers import categories as categories_router
from app.api.routers import brands as brands_router
from app.api.routers import payment_methods as payment_methods_router
from app.api.routers import purchases as purchases_router
from app.api.routers import likes as likes_router
from app.api.routers import comments as comments_router
from app.api.routers import follows as follows_router
from app.api.routers import badges as badges_router
from app.api.routers import ws as ws_router
from app.api.routers import admin as admin_router
from app.api.routers import notifications as notifications_router
from app.core.config import settings

app = FastAPI(swagger_ui_parameters={"persistAuthorization": True})

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_application() -> FastAPI:
    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(products.router, prefix="/api/products", tags=["products"])
    app.include_router(users_router.router, prefix="/api/users", tags=["users"])
    app.include_router(uploads_router.router, prefix="/api/uploads", tags=["uploads"])
    app.include_router(admin_products_router.router, prefix="/admin/products", tags=["admin-products"])
    app.include_router(admin_categories_router.router, prefix="/admin/categories", tags=["admin-categories"])
    app.include_router(admin_brands_router.router, prefix="/admin/brands", tags=["admin-brands"])
    app.include_router(categories_router.router, prefix="/api/categories", tags=["categories"])
    app.include_router(brands_router.router, prefix="/api/brands", tags=["brands"])
    app.include_router(payment_methods_router.router, prefix="/api/payment-methods", tags=["payment-methods"])
    app.include_router(purchases_router.router, prefix="/api/purchases", tags=["purchases"])
    app.include_router(posts_router.router)
    app.include_router(comments_router.router, prefix="/api", tags=["comments"])
    app.include_router(likes_router.router)
    app.include_router(follows_router.router)
    app.include_router(badges_router.router)
    app.include_router(notifications_router.router, prefix="/api/notifications", tags=["notifications"])
    app.include_router(ws_router.router)
    app.include_router(admin_router.router, prefix="/api/admin", tags=["admin"])

    if not os.path.exists(settings.ASSET_STORAGE_ROOT):
        os.makedirs(settings.ASSET_STORAGE_ROOT)

    app.mount(settings.ASSET_PUBLIC_BASE_URL, StaticFiles(directory=settings.ASSET_STORAGE_ROOT), name="storage")

    try:
        setup_admin(app)
    except Exception as e:
        print(f"SQLAdmin setup error: {e}")

    @app.get("/api/health")
    def health_check():
        return {"status": "ok"}

    @app.post("/api/internal/ws-notify-badge", include_in_schema=False)
    async def ws_notify_badge(payload: dict):
        """内部用: スクリプトからWebSocket badge_awarded 通知を発火する。"""
        from app.core.ws_manager import ws_manager
        user_id = payload.get("user_id")
        if user_id:
            await ws_manager.send_to_user(user_id, "badge_awarded", {
                "slug": payload.get("badge_slug", ""),
                "name": payload.get("badge_name", ""),
                "icon": payload.get("badge_icon", ""),
                "color": payload.get("badge_color", ""),
            })
        return {"ok": True}

    @app.post("/api/internal/ws-notify-ranking", include_in_schema=False)
    async def ws_notify_ranking():
        """内部用: スクリプトからWebSocket ranking_updated を全クライアントにブロードキャスト。"""
        from app.core.ws_manager import ws_manager
        await ws_manager.broadcast("ranking_updated")
        return {"ok": True}

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
    return app


app = get_application()
