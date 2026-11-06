"""Boolean-only signup preflight. Never returns provider identity details."""
from fastapi import HTTPException
from sqlalchemy import select, func, text
from sqlalchemy.exc import SQLAlchemyError
from app.models.user import User


def require_unused_signup_email(db, email):
    try:
        # Also protect legacy application accounts that may lack a provider row.
        app_exists = db.scalar(select(User.id).where(func.lower(User.email) == email).limit(1)) is not None
        # Auth-only identities must use verification/completion, not sign up again.
        auth_exists = False if app_exists else db.scalar(text(
            'SELECT EXISTS (SELECT 1 FROM neon_auth."user" WHERE lower(email) = :email)'
        ), {"email": email})
    except SQLAlchemyError:
        db.rollback()
        # Fail closed: do not forward to the mail-sending provider if checking failed.
        raise HTTPException(503, "Signup could not be checked. Please try again later.") from None
    if app_exists or auth_exists:
        raise HTTPException(409, detail={
            "code": "ACCOUNT_ALREADY_EXISTS",
            "message": "An account already uses this email. Sign in, or verify your email and finish account setup. No signup verification email was requested.",
        })
