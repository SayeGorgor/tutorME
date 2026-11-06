from datetime import date
import re
from fastapi import HTTPException
from app.core.config import settings

TERMS_VERSION = "2026-11-05-v1"


def policy_info():
    try:
        effective = date.fromisoformat(settings.legal_effective_date).isoformat()
    except ValueError:
        effective = None
    email = settings.legal_contact_email.strip()
    contact_valid = bool(re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email))
    ready = bool(settings.legal_publication_approved and settings.legal_operator_name.strip() and contact_valid and effective)
    return {"ready": ready, "operatorName": settings.legal_operator_name.strip() or None,
            "contactEmail": email if contact_valid else None, "effectiveDate": effective,
            "termsVersion": TERMS_VERSION, "bookingsEnabled": ready and settings.bookings_enabled,
            "minorProfilesEnabled": False}


def require_policies():
    if not policy_info()["ready"]:
        raise HTTPException(503, "New registration and booking are paused until the operator publishes approved policies and verified contact information")
