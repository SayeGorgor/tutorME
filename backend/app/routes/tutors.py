
import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Annotated
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.tutor_availability import TutorAvailability
from app.models.user import User, UserRole
from app.models.service_area import ServiceArea
from app.models.subject import Subject
from app.schemas.location import LocationPreferences, TutorSearch
from app.services.tutor_search import search_tutors
from app.models.tutor_profile import TutorProfile
from app.actions.actions import haversine_distance, get_current_user

from app.schemas.user import UserResponse
from app.schemas.tutor import TutorProfileResponse, TutorProfileUpdate, TutorSearchResponse
from app.schemas.tutor_availability import TutorAvailabilityCreate, TutorAvailabilityResponse

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/tutors",
    tags=["Tutors"]
)

def require_owner(user: User, user_id: int):
    if user.role != UserRole.TUTOR or user.id != user_id:
        raise HTTPException(403, "You can only edit your own tutor profile")


@router.get("/", response_model=list[TutorProfileResponse])
def get_tutors(params: Annotated[TutorSearch, Query()], db: Session = Depends(get_db)):
    return search_tutors(db, params)["items"]


@router.get("/search", response_model=TutorSearchResponse)
def search(params: Annotated[TutorSearch, Query()], db: Session = Depends(get_db)):
    return search_tutors(db, params)


@router.put("/user/{user_id}/location", response_model=TutorProfileResponse)
def save_location(user_id: int, preferences: LocationPreferences,
                  db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_owner(current_user, user_id)
    tutor = db.scalar(select(TutorProfile).where(TutorProfile.user_id == user_id))
    if not tutor:
        raise HTTPException(404, "Tutor not found")
    if preferences.service_area_id and not db.get(ServiceArea, preferences.service_area_id):
        raise HTTPException(422, "Unknown service area")
    data = preferences.model_dump(exclude={"public_area_consent"})
    if not preferences.in_person_enabled:
        data.update(service_area_id=None, place_id=None, meeting_preferences=None)
    for field, value in data.items():
        setattr(tutor, field, value)
    try:
        db.commit()
        db.refresh(tutor)
    except Exception:
        db.rollback()
        raise HTTPException(500, "Unable to save tutoring preferences")
    return tutor


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
    require_owner(current_user, user_id)

    tutor = db.scalars(
        select(TutorProfile)
        .where(TutorProfile.user_id == user_id)
    ).first()
    if not tutor:
        logger.exception("Tutor not found for user_id: %s", user_id)
        raise HTTPException(status_code=404, detail="Tutor not found")

    update_data = user_data.model_dump(exclude_unset=True)

    subject_ids = update_data.pop("subject_ids", None)
    if subject_ids is not None:
        subjects = db.scalars(select(Subject).where(Subject.id.in_(set(subject_ids)))).all()
        if len(subjects) != len(set(subject_ids)):
            raise HTTPException(422, "Unknown subject")
        tutor.subjects = list(subjects)
    # Availability is handled by its dedicated endpoint, not raw ORM assignment.
    if "availability" in update_data:
        raise HTTPException(422, "Use the availability endpoint")
    for field, value in update_data.items():
        setattr(tutor, field, value)


    db.commit()
    db.refresh(tutor)
    return tutor

@router.put("/{tutor_id}/availability", response_model=TutorAvailabilityResponse)
def update_tutor_availability(
    tutor_id: int,
    availability_data: TutorAvailabilityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tutor = db.scalar(select(TutorProfile).where(TutorProfile.id == tutor_id).with_for_update())
    if not tutor:
        raise HTTPException(404, "Tutor not found")
    require_owner(current_user, tutor.user_id)

    try:
        db.query(TutorAvailability).filter(
            TutorAvailability.tutor_id == tutor_id
        ).delete()

        for availability in availability_data.availability:
            new_availability = TutorAvailability(
                tutor_id=tutor_id,
                type=availability.type,
                day_of_the_week=availability.day_of_the_week,
                date=availability.date,
                start_time=availability.start_time,
                end_time=availability.end_time,
                timezone=availability.timezone
            )
            db.add(new_availability)

        db.commit()

        availability = db.scalars(
            select(TutorAvailability).where(
                TutorAvailability.tutor_id == tutor_id
            )
        ).all()

        return {"availability": availability}
    except Exception as e:
        db.rollback()
        logger.exception("Error updating availability for tutor_id: %s", tutor_id)
        raise HTTPException(status_code=500, detail="Failed to update availability")

@router.get("/distance")
def get_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
):
    distance = haversine_distance(lat1, lon1, lat2, lon2)
    return {"distance": distance}
