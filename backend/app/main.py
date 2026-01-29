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
