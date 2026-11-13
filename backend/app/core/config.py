from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    google_maps_api_key: str = Field(
        default="", repr=False
    )  # Legacy server setting; never sent to the browser.
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

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", hide_input_in_errors=True
    )

    @classmethod
    def settings_customise_sources(
        cls, settings_cls, init_settings, env_settings, dotenv_settings, file_secret_settings
    ):
        # Test opt-ins are process-only and must never become application flags.
        # Ignore only these known test keys in dotenv; still reject other typos.
        test_keys = {
            "tutorme_run_postgres_tests",
            "tutorme_test_database_is_disposable",
            "tutorme_test_database_url",
            "tutorme_test_project_id",
            "tutorme_test_branch_id",
            "tutorme_test_database_name",
        }

        def application_dotenv():
            return {
                key: value
                for key, value in dotenv_settings().items()
                if key.lower() not in test_keys
            }

        return init_settings, env_settings, application_dotenv, file_secret_settings


settings = Settings()
