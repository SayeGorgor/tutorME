from app.schemas.base import APIModel
from app.schemas.user import UserResponse

class TutorResponse(APIModel):
    user_id: int
    intro: str
    bio: str
    price: float
    user: UserResponse