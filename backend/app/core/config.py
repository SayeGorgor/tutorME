from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    csc_location_api_key: str
    csc_api_url: str
    database_url: str
    neon_auth_base_url: str
    neon_auth_jwks_url: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()