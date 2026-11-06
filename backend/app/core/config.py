from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    google_maps_api_key: str = Field(default="", repr=False)  # Legacy server setting; never sent to the browser.
    legal_operator_name: str = ""
    legal_contact_email: str = ""
    legal_effective_date: str = ""
    legal_publication_approved: bool = False
    bookings_enabled: bool = False
    csc_location_api_key: str
    csc_api_url: str
    database_url: str
    neon_auth_base_url: str
    neon_auth_jwks_url: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()