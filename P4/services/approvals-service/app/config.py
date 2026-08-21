import os


def required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Falta la variable de entorno {name}")
    return value


class Settings:
    def __init__(self) -> None:
        self.port = int(os.getenv("PORT", "4004"))
        self.database_url = required("DATABASE_URL")
        self.jwt_secret = required("JWT_SECRET")
        self.authz_service_url = required("AUTHZ_SERVICE_URL")
        self.audit_service_url = required("AUDIT_SERVICE_URL")
        self.notifications_service_url = required("NOTIFICATIONS_SERVICE_URL")
        self.authz_max_retries = int(os.getenv("AUTHZ_MAX_RETRIES", "3"))
        self.authz_backoff_ms = int(os.getenv("AUTHZ_BACKOFF_MS", "300"))


settings = Settings()
