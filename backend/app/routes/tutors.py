
import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.user import User
from app.models.tutor_profile import TutorProfile
from app.actions.actions import haversine_distance, get_current_user

from app.schemas.user import UserResponse
from app.schemas.tutor import TutorProfileResponse, TutorProfileUpdate

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/tutors",
    tags=["Tutors"]
)

@router.get("/", response_model=list[TutorProfileResponse])
def get_tutors(db: Session = Depends(get_db)):
    # Placeholder for tutor retrieval logic
    tutors = db.scalars(select(TutorProfile)).all()

    return tutors

@router.get("/user/{user_id}", response_model=TutorProfileResponse)
def get_tutor_by_user_id(user_id: int, db: Session = Depends(get_db)):
    tutor = db.scalars(select(TutorProfile).where(TutorProfile.user_id == user_id)).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    return tutor

@router.patch("/user/{user_id}", response_model=TutorProfileResponse)
def update_tutor_by_user_id(
    user_id: int, 
    user_data: TutorProfileUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    tutor = db.scalars(
        select(TutorProfile)
        .where(TutorProfile.user_id == user_id)
    ).first()
    if not tutor:
        logger.exception("Tutor not found for user_id: %s", user_id)
        raise HTTPException(status_code=404, detail="Tutor not found")

    update_data = user_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(tutor, field, value)


    db.commit()
    db.refresh(tutor)
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
