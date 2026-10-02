from app.schemas.base import APIModel
from app.schemas.summaries import UserSummary
from app.schemas.tutor_availability import TutorAvailabilitySummary

class TutorProfileResponse(APIModel):
    id: int
    user_id: int
    intro: str
    bio: str
    price: float
    user: UserSummary
    availability: list[TutorAvailabilitySummary]

class TutorProfileUpdate(APIModel):
    intro: str | None = None
    bio: str | None = None
    price: float | None = None
    availability: list[TutorAvailabilitySummary] | None = None