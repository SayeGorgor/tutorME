from app.schemas.base import APIModel
from typing import Optional
from app.schemas.summaries import UserSummary

class ReviewCreate(APIModel):
    author_id: int
    tutor_id: int
    rating: int
    comment: Optional[str] = None

class ReviewResponse(APIModel):
    id: int
    author_id: int
    tutor_id: int
    rating: int
    comment: Optional[str] = None

    author: UserSummary
    tutor: UserSummary