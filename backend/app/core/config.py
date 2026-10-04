from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Subastas API"
    app_env: str = "development"
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "subastas_db"
    auto_seed: bool = True
    admin_username: str = "admin"
    admin_email: str = "admin@subastas.local"
    admin_password: str = "admin123"
    session_ttl_hours: int = 72

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
