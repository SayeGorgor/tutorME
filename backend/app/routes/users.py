import logging

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.actions.actions import get_current_user, get_identity
from app.services.policies import require_policies
from datetime import datetime, timezone
from app.schemas.user import EligibilityAcceptance, UserCompletion
from app.services.registration import complete_registration, verified_identity_email, identity_name
from app.models.booking import DeletionRequest
from sqlalchemy.exc import IntegrityError
from app.services.deletion import deletion_is_active, CLOSED_DELETION_STATES
from app.models.user import User, UserRole
from app.schemas.user import UserResponse, UserCreate


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserResponse)
def create_user(
    user_data: UserCreate, db: Session = Depends(get_db), identity: dict = Depends(get_identity)
):
    return complete_registration(db, identity, user_data, user_data.auth_id, user_data.email)


@router.post("/complete-registration", response_model=UserResponse)
def finish_registration(
    data: UserCompletion, db: Session = Depends(get_db), identity: dict = Depends(get_identity)
):
    return complete_registration(db, identity, data)


@router.get("/registration-status")
def registration_status(db: Session = Depends(get_db), identity: dict = Depends(get_identity)):
    existing = db.scalar(select(User).where(User.auth_id == identity["sub"]))

    if existing:
        return {"status": "complete", "role": existing.role}

    try:
        email = verified_identity_email(identity)
        name = identity_name(identity)
    except HTTPException as exc:
        return {"status": exc.detail["code"], "message": exc.detail["message"]}

    return {"status": "needs_completion", "email": email, "name": name}


@router.get("/me", response_model=UserResponse)
def get_current_user_route(
    current_user: User = Depends(get_current_user), response_model=UserResponse
):
    return current_user


@router.post("/eligibility", response_model=UserResponse)
def accept_eligibility(
    data: EligibilityAcceptance,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_policies()
    if (current_user.role == UserRole.TUTOR) != (data.account_purpose == "tutor"):
        raise HTTPException(422, "Account purpose must match your role")

    current_user.account_purpose = data.account_purpose
    current_user.adult_attested_at = datetime.now(timezone.utc)
    current_user.terms_version = data.terms_version
    current_user.terms_accepted_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(current_user)

    return current_user


@router.get("/me/deletion-request")
def deletion_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    request = db.get(DeletionRequest, current_user.id)

    return {
        "status": request.status if request else "not_requested",
        "requestedAt": request.requested_at if request else None,
        "blocksNewBookings": deletion_is_active(request.status) if request else False,
        "canSubmit": request is None,
    }


@router.post("/me/deletion-request")
def request_deletion(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Request only; no cascade deletion of users, auth identities, or appointment history.
    db.scalar(select(User).where(User.id == current_user.id).with_for_update())

    existing = db.get(DeletionRequest, current_user.id)

    if existing and existing.status in CLOSED_DELETION_STATES:
        raise HTTPException(
            409,
            "Your earlier deletion request is closed. Contact the privacy operator for a new review; the previous record is preserved.",
        )
    if not existing:
        db.add(DeletionRequest(user_id=current_user.id))

        try:
            db.commit()
        except IntegrityError:
            db.rollback()  # Concurrent duplicate requests are idempotent.

    return deletion_status(db, current_user)
