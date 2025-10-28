from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    # Argon2 parameters (tunable per environment)
    ARGON2_TIME_COST: int = 2
    ARGON2_MEMORY_COST: int = 65536  # in KiB (64 MiB)
    ARGON2_PARALLELISM: int = 2

    model_config = ConfigDict(env_prefix="")


settings = Settings()
