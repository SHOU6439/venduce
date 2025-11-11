from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    # Argon2 parameters (tunable per environment)
    ARGON2_TIME_COST: int = 2
    ARGON2_MEMORY_COST: int = 65536  # in KiB (64 MiB)
    ARGON2_PARALLELISM: int = 2
    MAIL_ENABLED: bool = False
    MAIL_FROM: str = "no-reply@example.com"
    MAIL_HOST: str = "localhost"
    MAIL_PORT: int = 1025
    MAIL_USERNAME: str | None = None
    MAIL_PASSWORD: str | None = None
    JWT_PRIVATE_KEY: str | None = None
    JWT_PUBLIC_KEY: str | None = None
    JWT_SECRET_KEY: str | None = None
    JWT_ALGORITHM: str = "RS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14
    REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER: int = 60

    model_config = ConfigDict(env_prefix="")


settings = Settings()
