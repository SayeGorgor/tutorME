from app.schemas.base import APIModel
from typing import Optional
from app.models.user import UserRole
from app.schemas.review import ReviewResponse
from app.schemas.summaries import UserSummary

class UserCreate(APIModel):
    auth_id: str
    email: str
    first_name: str
    last_name: str
    role: UserRole
    timezone: str

class UserResponse(UserSummary):
    role: UserRole
    timezone: str
    created_at: str
    phone_number: Optional[str] = None
    subject: Optional[str] = None
    pfp: Optional[str] = None

    reviews_written: list[ReviewResponse] = []
    reviews_received: list[ReviewResponse] = []