from typing import Literal
from pydantic import Field, model_validator, computed_field
from app.services.geographic_names import geographic_display_name, geographic_display_label
from app.schemas.base import APIModel


class ServiceAreaResponse(APIModel):
    id: str
    name: str
    region: str
    country: str
    postal_code: str | None = None
    latitude: float
    longitude: float
    source: str

    @computed_field
    @property
    def display_name(self) -> str:
        return geographic_display_name(self)

    @computed_field
    @property
    def display_label(self) -> str:
        return geographic_display_label(self)


class LocationPreferences(APIModel):
    online_enabled: bool
    in_person_enabled: bool
    service_area_id: str | None = Field(default=None, max_length=80)
    place_id: str | None = Field(default=None, max_length=255)
    travel_radius_miles: float = Field(default=25, ge=0, le=100, allow_inf_nan=False)
    meeting_preferences: Literal["Public libraries", "Public cafes", "Public campus spaces", "Public libraries or cafes"] | None = None
    public_area_consent: bool = False

    @model_validator(mode="after")
    def check_modes(self):
        if not self.online_enabled and not self.in_person_enabled:
            raise ValueError("Enable at least one tutoring mode")
        if self.in_person_enabled and (not self.service_area_id or not self.public_area_consent):
            raise ValueError("In-person tutoring requires a service area and consent to public area display")
        return self


class TutorSearch(APIModel):
    mode: Literal["all", "online", "in-person"] = "all"
    area_id: str | None = Field(default=None, max_length=80)
    radius: float = Field(default=25, ge=0, le=100, allow_inf_nan=False)
    subject: str | None = Field(default=None, max_length=255)
    min_price: float = Field(default=0, ge=0, le=10000, allow_inf_nan=False)
    max_price: float = Field(default=10000, ge=0, le=10000, allow_inf_nan=False)
    limit: int = Field(default=20, ge=1, le=50)
    offset: int = Field(default=0, ge=0, le=10000)

    @model_validator(mode="after")
    def check_search(self):
        if self.min_price > self.max_price:
            raise ValueError("Minimum price cannot exceed maximum price")
        if self.mode == "in-person" and not self.area_id:
            raise ValueError("Select a city or ZIP service area for in-person searches")
        return self


class SelectedPlaceArea(APIModel):
    """Transient selection hints only; never inserted into the geographic catalog."""
    country: Literal["US"]
    city: str | None = Field(default=None, min_length=1, max_length=100)
    region: str | None = Field(default=None, pattern=r"^[A-Z]{2}$")
    postal_code: str | None = Field(default=None, pattern=r"^[0-9]{5}$")

    @model_validator(mode="after")
    def require_area(self):
        if not self.postal_code and not (self.city and self.city.strip() and self.region):
            raise ValueError("Choose a city and state or a five-digit ZIP code")
        return self
