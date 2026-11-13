from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.dependencies import get_db
from app.services.policies import policy_info
from app.schemas.user import RegistrationCheck
from app.services.signup_check import require_unused_signup_email
from app.services.policies import require_policies

router = APIRouter(prefix="/policies", tags=["Policies"])


@router.get("")
def policies():
    return policy_info()


@router.post("/registration-check")
def registration_check(data: RegistrationCheck, db: Session = Depends(get_db)):
    require_policies()
    require_unused_signup_email(db, data.email)

    return {"eligible": True}
