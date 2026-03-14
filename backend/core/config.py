from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ───────────────────────────────────────────────────────────────────
    app_env: str = "development"
    debug: bool = False
    log_level: str = "INFO"
    allowed_origins: str = "http://localhost:3000,http://localhost:5173"

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str
    database_url_sync: str

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── Security ──────────────────────────────────────────────────────────────
    secret_key: str
    certificate_signing_key: str

    # ── Scanning ──────────────────────────────────────────────────────────────
    max_concurrent_scans: int = 50
    scan_timeout_seconds: int = 30
    ct_log_cache_ttl_hours: int = 24
    rate_limit_scans_per_hour: int = 20

    # ── CRQC Timeline ─────────────────────────────────────────────────────────
    crqc_pessimistic_year: int = 2028
    crqc_moderate_year: int = 2032
    crqc_optimistic_year: int = 2037

    # ── AI Module ─────────────────────────────────────────────────────────────
    anthropic_api_key: str = ""
    ai_confidence_threshold: float = 0.60
    distilbert_model_path: str = "./models/crypto_classifier"

    # ── CT Log ────────────────────────────────────────────────────────────────
    crtsh_base_url: str = "https://crt.sh"
    ct_log_timeout_seconds: int = 30

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v: str) -> str:
        return v

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    """
    Cached settings instance — loaded once, reused everywhere.
    Call get_settings() instead of instantiating Settings() directly.
    """
    return Settings()


# Module-level shortcut for convenience
settings = get_settings()
