from app.schemas.base import APIModel
from app.models.user import UserRole
from datetime import datetime

class UserSummary(APIModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: UserRole
    timezone: str

class AvailabilitySummary(APIModel):
    id: int
    tutor_id: int
    day_of_week: int
    start_time: datetime
    end_time: datetime
    timezone: str