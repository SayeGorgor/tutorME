from app.schemas.base import APIModel
from datetime import datetime

class TutorAvailabilityBase(APIModel):
    type: str
    day_of_the_week: int | None = None
    date: str | None = None
    start_time: int
    end_time: int
    timezone: str

class TutorAvailability(TutorAvailabilityBase):
    id: int
    tutor_id: int
    created_at: datetime

class TutorAvailabilitySummary(APIModel):
    id: int
    type: str
    tutor_id: int
    day_of_the_week: int | None = None
    date: str | None = None
    start_time: int
    end_time: int
    timezone: str

class TutorAvailabilityCreate(APIModel):
    availability: list[TutorAvailabilityBase]

class TutorAvailabilityResponse(APIModel):
    availability: list[TutorAvailability]