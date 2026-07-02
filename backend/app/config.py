from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://vlms:vlms_dev@localhost:5432/vlms"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "dev-secret-key-change-in-production"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    cors_origins: str = '["http://localhost:5173"]'
    whatsapp_phone_number_id: str = ""
    whatsapp_access_token: str = ""
    whatsapp_api_base_url: str = "https://graph.facebook.com"
    whatsapp_api_version: str = "v21.0"
    whatsapp_webhook_verify_token: str = "vlms-verify-token"
    host_timeout_seconds: int = 300
    auto_checkout_minutes: int = 480
    whatsapp_auto_accept: bool = True
    # EOD (End of Day) configuration
    eod_checkout_hour: int = 23
    eod_checkout_minute: int = 59
    eod_timezone: str = "America/Tijuana"
    whatsapp_auto_eod_notify: bool = False
    environment: Literal["dev", "staging", "production"] = "dev"
    log_level: str = "DEBUG"
    log_dir: str = "logs"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
