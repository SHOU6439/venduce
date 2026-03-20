from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    # Argon2 parameters (tunable per environment)
    ARGON2_TIME_COST: int = 2
    ARGON2_MEMORY_COST: int = 65536  # in KiB (64 MiB)
    ARGON2_PARALLELISM: int = 2
    APP_ENV: str = "development"  # "development" | "production"
    MAIL_ENABLED: bool = False
    MAIL_FROM: str = "Venduce <no-reply@venduce.com>"
    MAIL_HOST: str = "localhost"
    MAIL_PORT: int = 1025
    FRONTEND_URL: str = "http://localhost:3000"
    MAIL_USERNAME: str | None = None
    MAIL_PASSWORD: str | None = None
    RESEND_API_KEY: str | None = None
    JWT_PRIVATE_KEY: str | None = None
    JWT_PUBLIC_KEY: str | None = None
    JWT_PRIVATE_KEY_PATH: str | None = "keys/private.pem"
    JWT_PUBLIC_KEY_PATH: str | None = "keys/public.pem"
    JWT_SECRET_KEY: str | None = None
    JWT_ALGORITHM: str = "RS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14
    REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER: int = 60
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30
    API_TITLE: str = "Venduce API"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "Venduce backend API"
    ASSET_STORAGE_ROOT: str = "storage"
    ASSET_PUBLIC_BASE_URL: str = "/storage"

    model_config = ConfigDict(env_prefix="")


settings = Settings()
