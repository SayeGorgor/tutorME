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