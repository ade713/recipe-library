from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Recipe Library API"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://recipe_library:recipe_library_dev_password@localhost:5433/recipe_library"
    secret_key: str = "development-only-secret-key-change-me"
    access_token_expire_minutes: int = 60
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:19006", "http://localhost:3000"]
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
