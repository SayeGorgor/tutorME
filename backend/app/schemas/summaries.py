from app.schemas.base import APIModel

class UserSummary(APIModel):
    id: int
    first_name: str
    last_name: str
    email: str