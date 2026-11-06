from datetime import datetime, timedelta, timezone, date, time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from uuid import uuid4
from urllib.parse import urlparse
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.booking import Booking
from app.models.user import User, UserRole
from app.models.tutor_profile import TutorProfile
from app.models.tutor_availability import TutorAvailability
from app.schemas.booking import BookingCreate
from app.services.deletion import account_has_active_deletion
from app.services.policies import require_policies, policy_info, TERMS_VERSION

UTC = timezone.utc


def utc(value):
    # SQLite fixtures return naive values; PostgreSQL stores timezone-aware instants.
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def booking_gate():
    require_policies()
    if not policy_info()["bookingsEnabled"]:
        raise HTTPException(503, "Real booking is not enabled by the operator yet")


def adult(user):
    if not user.adult_attested_at or not user.terms_accepted_at or user.terms_version != TERMS_VERSION:
        raise HTTPException(403, "Confirm adult eligibility and accept the current Terms in account settings")
    if user.account_purpose == "guardian":
        raise HTTPException(403, "Bookings for minors are not enabled. No child information should be submitted.")
    if user.account_purpose not in ("self", "tutor"):
        raise HTTPException(403, "Confirm the account purpose in account settings")


def real_tutor(tutor):
    if tutor is None:
        raise HTTPException(404, "Tutor not found")
    if tutor.is_demo:
        raise HTTPException(403, "Demo profiles cannot receive genuine bookings")


def supported(tutor, mode):
    if not ((mode == "online" and tutor.online_enabled) or (mode == "in-person" and tutor.in_person_enabled and tutor.service_area_id)):
        raise HTTPException(422, "This tutor does not offer that lesson format")


def local_instant(day, minute, zone):
    local = datetime.combine(day, time()) + timedelta(minutes=minute)
    first, second = local.replace(tzinfo=zone, fold=0), local.replace(tzinfo=zone, fold=1)
    if first.utcoffset() != second.utcoffset() or first.astimezone(UTC).astimezone(zone).replace(tzinfo=None) != local:
        return None  # Do not offer ambiguous or nonexistent DST wall-clock times.
    return first.astimezone(UTC)


def unambiguous(value, zone):
    local = value.astimezone(zone)
    return local_instant(local.date(), local.hour * 60 + local.minute, zone) == value


def row_window(row, day):
    try:
        zone = ZoneInfo(row.timezone)
        if row.type == "weekly" and row.day_of_the_week != (day.weekday() + 1) % 7:
            return None
        if row.type == "custom" and row.date != day.isoformat():
            return None
        if row.type not in ("weekly", "custom") or not (0 <= row.start_time < row.end_time <= 1440):
            return None
        start, end = local_instant(day, row.start_time, zone), local_instant(day, row.end_time, zone)
        return (start, end) if start and end and start < end else None
    except (ZoneInfoNotFoundError, ValueError, TypeError):
        return None


def available(db, tutor_id, start, end):
    rows = db.scalars(select(TutorAvailability).where(TutorAvailability.tutor_id == tutor_id)).all()
    for row in rows:
        try:
            zone = ZoneInfo(row.timezone)
            local_day = start.astimezone(zone).date()
            if not unambiguous(start, zone) or not unambiguous(end, zone):
                continue
        except (ZoneInfoNotFoundError, ValueError):
            continue
        for day in (local_day - timedelta(days=1), local_day):
            window = row_window(row, day)
            if window and window[0] <= start and end <= window[1]:
                # Existing calendar represents half-hour boundaries.
                minutes = (start - window[0]).total_seconds() / 60
                if minutes % 30 == 0:
                    return True
    return False


def overlaps(db, tutor_id, student_id, start, end, exclude=None):
    query = select(Booking.id).where(Booking.status == "confirmed", Booking.starts_at < end, Booking.ends_at > start,
        or_(Booking.tutor_id == tutor_id, Booking.student_id == student_id))
    if exclude:
        query = query.where(Booking.id != exclude)
    return db.scalar(query.limit(1)) is not None


def lock_participants(db, tutor_id, student_id):
    tutor = db.get(TutorProfile, tutor_id)
    if not tutor:
        raise HTTPException(404, "Tutor not found")
    # Shared order prevents lock inversion when the same participant is involved.
    db.scalars(select(User).where(User.id.in_(sorted({student_id, tutor.user_id}))).order_by(User.id).with_for_update()).all()
    return db.scalar(select(TutorProfile).where(TutorProfile.id == tutor_id).with_for_update().execution_options(populate_existing=True))


def submit(db: Session, user: User, data: BookingCreate):
    booking_gate(); adult(user)
    if user.role != UserRole.STUDENT or user.account_purpose != "self":
        raise HTTPException(403, "Only self-managed adult student accounts can request appointments")
    if account_has_active_deletion(db, user.id):
        raise HTTPException(403, "New bookings are paused while your deletion request is reviewed")
    tutor = lock_participants(db, data.tutor_id, user.id)
    real_tutor(tutor); adult(tutor.user); supported(tutor, data.mode)
    if account_has_active_deletion(db, tutor.user_id):
        raise HTTPException(409, "This tutor is not accepting new appointment requests")
    if tutor.user_id == user.id:
        raise HTTPException(422, "You cannot book yourself")
    start, end = utc(data.starts_at), utc(data.starts_at) + timedelta(hours=1)
    previous = db.scalar(select(Booking).where(Booking.student_id == user.id, Booking.idempotency_key == data.idempotency_key))
    if previous:
        if previous.tutor_id != tutor.id or previous.mode != data.mode or utc(previous.starts_at) != start:
            raise HTTPException(409, "Idempotency key was already used for a different request")
        return previous
    now = datetime.now(UTC)
    if start <= now or start > now + timedelta(days=30):
        raise HTTPException(422, "Choose a future appointment within the next 30 days")
    if not available(db, tutor.id, start, end):
        raise HTTPException(409, "The selected time is outside the tutor's current availability")
    if overlaps(db, tutor.id, user.id, start, end):
        raise HTTPException(409, "This time conflicts with a confirmed appointment")
    duplicate = db.scalar(select(Booking).where(Booking.student_id == user.id, Booking.tutor_id == tutor.id,
        Booking.starts_at == start, Booking.status == "pending"))
    if duplicate:
        if duplicate.mode != data.mode:
            raise HTTPException(409, "You already have a pending request for this time in another lesson format. Cancel it before changing formats.")
        return duplicate
    pending_count = db.scalar(select(func.count()).select_from(Booking).where(Booking.student_id == user.id, Booking.status == "pending")) or 0
    if pending_count >= 20:
        raise HTTPException(429, "Review or cancel existing requests before submitting more appointments")
    booking = Booking(id=str(uuid4()), student_id=user.id, tutor_id=tutor.id, mode=data.mode, starts_at=start,
                      ends_at=end, status="pending", idempotency_key=data.idempotency_key)
    db.add(booking); db.commit(); db.refresh(booking)
    return booking


def participant(db, user, booking_id):
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    tutor = db.get(TutorProfile, booking.tutor_id)
    if user.id not in (booking.student_id, tutor.user_id):
        raise HTTPException(404, "Booking not found")
    return booking, tutor


def transition(db, user, booking_id, action):
    booking, tutor = participant(db, user, booking_id)
    tutor = lock_participants(db, tutor.id, booking.student_id)
    db.refresh(booking)
    is_tutor = user.id == tutor.user_id
    now = datetime.now(UTC)
    targets = {"confirm": "confirmed", "decline": "declined", "cancel": "cancelled", "complete": "completed"}
    if action != "cancel" and not is_tutor:
        raise HTTPException(403, "Only the booked tutor can perform this action")
    if booking.status == targets[action]:
        return booking
    if action in ("confirm", "decline"):
        if booking.status != "pending" or utc(booking.starts_at) <= now:
            raise HTTPException(409, "Only future pending requests can be accepted or declined")
        if action == "confirm":
            booking_gate(); adult(user); adult(db.get(User, booking.student_id)); real_tutor(tutor); supported(tutor, booking.mode)
            if account_has_active_deletion(db, user.id) or account_has_active_deletion(db, booking.student_id):
                raise HTTPException(409, "A participant account is not eligible for new appointment confirmations")
            if not available(db, tutor.id, utc(booking.starts_at), utc(booking.ends_at)):
                raise HTTPException(409, "The tutor's availability changed; decline and request a new time")
            if overlaps(db, tutor.id, booking.student_id, utc(booking.starts_at), utc(booking.ends_at), booking.id):
                raise HTTPException(409, "A confirmed appointment overlaps this request")
    elif action == "cancel":
        if booking.status not in ("pending", "confirmed") or utc(booking.starts_at) <= now:
            raise HTTPException(409, "Only future pending or confirmed appointments can be cancelled")
        booking.meeting_details = None
    elif action == "complete":
        if booking.status != "confirmed" or utc(booking.ends_at) > now:
            raise HTTPException(409, "Only a finished confirmed appointment can be marked completed")
    booking.status = targets[action]
    db.commit(); db.refresh(booking)
    return booking


def public_to_participants(db, booking):
    tutor = db.get(TutorProfile, booking.tutor_id)
    student = db.get(User, booking.student_id)
    return {"id": booking.id, "student_id": booking.student_id, "tutor_id": booking.tutor_id,
            "mode": booking.mode, "starts_at": utc(booking.starts_at), "ends_at": utc(booking.ends_at),
            "status": booking.status, "created_at": utc(booking.created_at),
            "meeting_details": booking.meeting_details if booking.status == "confirmed" else None,
            "student_name": f"{student.first_name} {student.last_name}",
            "tutor_name": f"{tutor.user.first_name} {tutor.user.last_name}"}
