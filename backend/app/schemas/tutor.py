from app.schemas.base import APIModel
from app.schemas.location import ServiceAreaResponse
from pydantic import Field, field_validator
from decimal import Decimal

class SubjectSummary(APIModel):
    id: int
    name: str
    category: str

from app.schemas.summaries import UserSummary
from app.schemas.tutor_availability import TutorAvailabilitySummary

class PublicTutorUser(APIModel):
    id: int
    first_name: str
    last_name: str
    role: str
    timezone: str

class TutorProfileResponse(APIModel):
    id: int
    user_id: int
    intro: str
    bio: str
    price: float
    user: PublicTutorUser
    availability: list[TutorAvailabilitySummary]
    is_demo: bool = False
    online_enabled: bool = True
    in_person_enabled: bool = False
    service_area: ServiceAreaResponse | None = None
    travel_radius_miles: float = 25
    meeting_preferences: str | None = None
    subjects: list[SubjectSummary] = []

class TutorProfileUpdate(APIModel):
    intro: str | None = None
    bio: str | None = None
    price: Decimal | None = Field(default=None, ge=0, le=10000, decimal_places=2, allow_inf_nan=False)
    @field_validator("price")
    @classmethod
    def price_must_be_present(cls, value):
        if value is None:
            raise ValueError("Hourly rate cannot be empty")
        return value

    subject_ids: list[int] | None = Field(default=None, max_length=50)
    availability: list[TutorAvailabilitySummary] | None = None

class TutorSearchItem(TutorProfileResponse):
    distance_miles: float | None = None
    in_person_match: bool = False


class TutorSearchResponse(APIModel):
    items: list[TutorSearchItem]
    total: int
    limit: int
    offset: int
