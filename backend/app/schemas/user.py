from app.schemas.base import APIModel
from typing import Optional
from pydantic import Field
from app.models.user import UserRole
from app.schemas.review import ReviewResponse
from app.schemas.summaries import UserSummary

class UserCreate(APIModel):
    auth_id: str
    email: str
    first_name: str = Field(alias="firstName")
    last_name: str = Field(alias="lastName")
    role: UserRole
    timezone: str

class UserResponse(UserSummary):
    role: UserRole
    timezone: str
    created_at: str = Field(alias="createdAt")
    phone_number: Optional[str] = Field(default=None, alias="phoneNumber")
    subject: Optional[str] = None
    pfp: Optional[str] = None

    reviews_written: list[ReviewResponse] = []
    reviews_received: list[ReviewResponse] = []