from app.schemas.base import APIModel
from typing import Optional

class UserResponse(APIModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone_number: Optional[str] = None
    subject: Optional[str] = None
    pfp: Optional[str] = None