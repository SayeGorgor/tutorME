from datetime import date, datetime, timedelta, timezone, time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from app.db.dependencies import get_db
from app.actions.actions import get_current_user
from app.models.booking import Booking
from app.models.user import User
from app.models.tutor_profile import TutorProfile
from app.models.tutor_availability import TutorAvailability
from app.schemas.booking import BookingCreate, BookingAction, BookingResponse, MeetingDetails
from app.services import bookings as service

router = APIRouter(prefix="/bookings", tags=["Bookings"])

@router.get("/slots/{tutor_id}")
def slots(tutor_id: int, day: date, mode: str = Query(pattern="^(online|in-person)$"),
          timezone_name: str = Query(default="UTC", alias="timezone"), db: Session = Depends(get_db)):
    service.booking_gate()
    tutor = db.get(TutorProfile, tutor_id)
    service.real_tutor(tutor); service.adult(tutor.user); service.supported(tutor, mode)
    if service.account_has_active_deletion(db, tutor.user_id):
        raise HTTPException(409, "This tutor is not accepting new appointment requests")
    try:
        display_zone = ZoneInfo(timezone_name)
    except (ZoneInfoNotFoundError, ValueError):
        raise HTTPException(422, "Invalid time zone")
    now = datetime.now(timezone.utc)
    if not now.astimezone(display_zone).date() <= day <= (now + timedelta(days=30)).astimezone(display_zone).date():
        raise HTTPException(422, "Choose a date within the next 30 days")
    rows = db.scalars(select(TutorAvailability).where(TutorAvailability.tutor_id == tutor_id)).all()
    confirmed = db.scalars(select(Booking).where(Booking.tutor_id == tutor_id, Booking.status == "confirmed",
        Booking.ends_at > now, Booking.starts_at < now + timedelta(days=32))).all()
    result = set()
    for row in rows:
        try:
            row_zone = ZoneInfo(row.timezone)
        except (ZoneInfoNotFoundError, ValueError):
            continue
        # At extreme UTC offsets, the availability date can differ by two days
        # from the viewer's date. Derive the covered dates instead of guessing ±1.
        first_day = datetime.combine(day, time.min, tzinfo=display_zone).astimezone(row_zone).date()
        last_day = (datetime.combine(day + timedelta(days=1), time.min, tzinfo=display_zone)
                    - timedelta(microseconds=1)).astimezone(row_zone).date()
        for offset in range((last_day - first_day).days + 1):
            window = service.row_window(row, first_day + timedelta(days=offset))
            if not window:
                continue
            start = window[0]
            while start + timedelta(hours=1) <= window[1]:
                end = start + timedelta(hours=1)
                if service.unambiguous(start, row_zone) and service.unambiguous(end, row_zone) and now < start <= now + timedelta(days=30) and start.astimezone(display_zone).date() == day and not any(service.utc(b.starts_at) < end and service.utc(b.ends_at) > start for b in confirmed):
                    result.add(start)
                start += timedelta(minutes=30)
    return {"slots": sorted(result), "durationMinutes": 60, "timezone": timezone_name, "requiresTutorApproval": True}

@router.post("", response_model=BookingResponse)
def create(data: BookingCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.public_to_participants(db, service.submit(db, user, data))

@router.get("", response_model=list[BookingResponse])
def mine(limit: int = Query(default=50, ge=1, le=100), offset: int = Query(default=0, ge=0, le=10000),
         db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    tutor_ids = select(TutorProfile.id).where(TutorProfile.user_id == user.id)
    records = db.scalars(select(Booking).where(or_(Booking.student_id == user.id, Booking.tutor_id.in_(tutor_ids)))
        .order_by(Booking.starts_at.desc(), Booking.id).limit(limit).offset(offset)).all()
    return [service.public_to_participants(db, record) for record in records]

@router.post("/{booking_id}/status", response_model=BookingResponse)
def update_status(booking_id: str, data: BookingAction, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.public_to_participants(db, service.transition(db, user, booking_id, data.action))

@router.put("/{booking_id}/meeting", response_model=BookingResponse)
def save_meeting(booking_id: str, data: MeetingDetails, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    booking, tutor = service.participant(db, user, booking_id)
    service.lock_participants(db, tutor.id, booking.student_id); db.refresh(booking)
    if user.id != tutor.user_id or booking.status != "confirmed":
        raise HTTPException(403, "Only the booked tutor can set details for a confirmed appointment")
    if booking.mode == "online":
        parsed = urlparse(data.details)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            raise HTTPException(422, "Provide an HTTPS meeting URL without embedded credentials")
    elif not data.public_meeting_confirmed:
        raise HTTPException(422, "Confirm that this is an approved public meeting location, not a residence")
    booking.meeting_details = data.details
    db.commit(); db.refresh(booking)
    return service.public_to_participants(db, booking)
