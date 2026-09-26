from app.schemas.base import APIModel
from app.schemas.summaries import UserSummary, AvailabilitySummary

class TutorProfileResponse(APIModel):
    user_id: int
    intro: str
    bio: str
    price: float
    user: UserSummary
    availability: list[AvailabilitySummary]

class TutorProfileUpdate(APIModel):
    intro: str | None = None
    bio: str | None = None
    price: float | None = None
    availability: list[AvailabilitySummary] | None = None