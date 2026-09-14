from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.user import User
from app.models.tutor_profile import TutorProfile
from app.actions.location_actions import haversine_distance

from app.schemas.user import UserResponse
from app.schemas.tutor import TutorResponse

router = APIRouter(
    prefix="/tutors",
    tags=["Tutors"]
)

@router.get("/", response_model=list[TutorResponse])
def get_tutors(db: Session = Depends(get_db)):
    # Placeholder for tutor retrieval logic
    tutors = db.scalars(select(TutorProfile)).all()

    return tutors

@router.get("/user/{user_id}", response_model=TutorResponse)
def get_tutor_by_user_id(user_id: int, db: Session = Depends(get_db)):
    tutor = db.scalars(select(TutorProfile).where(TutorProfile.user_id == user_id)).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    return tutor

@router.get("/distance")
def get_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
):
    distance = haversine_distance(lat1, lon1, lat2, lon2)
    return {"distance": distance}
