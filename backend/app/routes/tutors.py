from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.user import User
from app.actions.location_actions import haversine_distance

from app.schemas.user import UserResponse

router = APIRouter(
    prefix="/tutors",
    tags=["Tutors"]
)

@router.get("/", response_model=list[UserResponse])
def get_tutors(db: Session = Depends(get_db)):
    # Placeholder for tutor retrieval logic
    tutors = db.scalars(
        select(User).where(
            User.role == "tutor"
        )
    ).all()

    return tutors

@router.get("/distance")
def get_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
):
    distance = haversine_distance(lat1, lon1, lat2, lon2)
    return {"distance": distance}
