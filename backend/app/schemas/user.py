from app.schemas.base import APIModel
from typing import Optional
from app.models.user import UserRole

class UserCreate(APIModel):
    auth_id: str
    email: str
    first_name: str
    last_name: str
    role: UserRole
    timezone: str

class UserResponse(APIModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone_number: Optional[str] = None
    subject: Optional[str] = None
    pfp: Optional[str] = None