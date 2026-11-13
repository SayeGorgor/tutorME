"""Authenticated application-user completion; never creates/deletes provider identities."""

import logging
import re
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from app.models.user import User
from app.models.tutor_profile import TutorProfile
from app.services.policies import require_policies

logger = logging.getLogger(__name__)


def identity_name(identity):
    name = identity.get("name")

    if not isinstance(name, str) or not name.strip():
        raise HTTPException(
            409,
            detail={
                "code": "PROVIDER_NAME_UNAVAILABLE",
                "message": "Your sign-in session does not include your registered name. Sign in again, or contact support if this continues.",
            },
        )

    return " ".join(name.split())


def verified_identity_email(identity):
    # identity comes exclusively from get_identity's signature/issuer/audience verification.
    email = identity.get("email")

    if not isinstance(email, str) or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise HTTPException(
            409,
            detail={
                "code": "PROVIDER_EMAIL_UNAVAILABLE",
                "message": "Your sign-in session does not provide the verified email information needed to finish setup. Sign in again; if this continues, contact support through the Privacy page.",
            },
        )

    flags = [identity[key] for key in ("emailVerified", "email_verified") if key in identity]

    if not flags:
        raise HTTPException(
            409,
            detail={
                "code": "PROVIDER_EMAIL_UNAVAILABLE",
                "message": "Your sign-in provider did not supply email verification status. Sign in again or contact support through the Privacy page.",
            },
        )
    if not all(flag is True for flag in flags):
        raise HTTPException(
            403,
            detail={
                "code": "EMAIL_VERIFICATION_REQUIRED",
                "message": "Verify your email with the sign-in provider, then sign in again and finish account setup. Do not register another account.",
            },
        )

    return email.strip().casefold()


def compatible_existing(user, data):
    if user.role != data.role or (
        user.account_purpose is not None and user.account_purpose != data.account_purpose
    ):
        raise HTTPException(
            409,
            "Your account already exists with a different role or purpose. Sign in and use account settings; completion does not change an existing account.",
        )

    # Retries do not rewrite names, roles, emails, or past acknowledgment times.
    return user


def complete_registration(db, identity, data, claimed_auth_id=None, claimed_email=None):
    require_policies()

    subject = identity["sub"]

    if claimed_auth_id is not None and claimed_auth_id != subject:
        raise HTTPException(403, "Account identity does not match the authenticated user")

    email = verified_identity_email(identity)

    if claimed_email is not None and claimed_email.strip().casefold() != email:
        raise HTTPException(403, "Use the verified email belonging to your signed-in identity")

    existing = db.scalar(select(User).where(User.auth_id == subject))

    if existing:
        return compatible_existing(existing, data)

    registered_name = identity_name(identity)

    if " ".join(f"{data.first_name} {data.last_name}".split()) != registered_name:
        raise HTTPException(
            409,
            detail={
                "code": "REGISTERED_NAME_MISMATCH",
                "message": "Use the name already registered with your sign-in account. Reload account setup to continue.",
            },
        )

    now = datetime.now(timezone.utc)
    user = User(
        auth_id=subject,
        email=email,
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        role=data.role,
        timezone=data.timezone,
        account_purpose=data.account_purpose,
        adult_attested_at=now,
        terms_version=data.terms_version,
        terms_accepted_at=now,
    )

    if data.role == "tutor":
        user.tutor_profile = TutorProfile(intro="", bio="", price=20.0)

    try:
        db.add(user)
        db.commit()
        db.refresh(user)

        return user
    except IntegrityError:
        db.rollback()

        # A simultaneous completion can win the unique auth_id race. Only return OUR identity.
        winner = db.scalar(select(User).where(User.auth_id == subject))

        if winner:
            return compatible_existing(winner, data)

        raise HTTPException(
            409,
            "An account email conflict needs support review. Your sign-in account was not deleted.",
        )
    except SQLAlchemyError:
        db.rollback()

        logger.warning("Application-user completion failed; safe retry is available")
        raise HTTPException(
            503,
            "Your sign-in account is safe, but setup could not be saved. Sign in and retry Finish account setup; do not register again.",
        )
