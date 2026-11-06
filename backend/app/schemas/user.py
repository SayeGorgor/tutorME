from app.schemas.base import APIModel
from typing import Optional
from pydantic import Field, StrictBool, model_validator, field_validator
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from datetime import datetime
from app.services.policies import TERMS_VERSION
from app.models.user import UserRole
from app.schemas.review import ReviewResponse
from app.schemas.summaries import UserSummary

class EligibilityAcceptance(APIModel):
    adult_confirmed: StrictBool
    terms_accepted: StrictBool
    terms_version: str
    account_purpose: Literal["self", "guardian", "tutor"]

    @model_validator(mode="after")
    def check_acceptance(self):
        if not self.adult_confirmed or not self.terms_accepted:
            raise ValueError("You must be 18 or older and explicitly accept the Terms")
        if self.terms_version != TERMS_VERSION:
            raise ValueError("Review and accept the current Terms version")
        return self


class RegistrationCheck(EligibilityAcceptance):
    email: str = Field(min_length=3, max_length=254)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value):
        import re
        value = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid email address")
        return value


class UserCompletion(EligibilityAcceptance):
    first_name: str = Field(alias="firstName", min_length=1, max_length=255)
    last_name: str = Field(alias="lastName", max_length=255)
    role: Literal["student", "tutor"]
    timezone: str

    @model_validator(mode="after")
    def check_purpose(self):
        if not self.first_name.strip():
            raise ValueError("Enter your registered name")
        if (self.role == "tutor") != (self.account_purpose == "tutor"):
            raise ValueError("Account purpose does not match role")
        try:
            ZoneInfo(self.timezone)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Select a valid time zone")
        return self

class UserCreate(UserCompletion):
    # Compatibility endpoint: these claims are checked, never trusted as authority.
    auth_id: str
    email: str


class UserResponse(UserSummary):
    role: UserRole
    timezone: str
    created_at: str = Field(alias="createdAt")
    phone_number: Optional[str] = Field(default=None, alias="phoneNumber")
    account_purpose: str | None = None
    adult_attested_at: datetime | None = None
    terms_version: str | None = None
    terms_accepted_at: datetime | None = None
    subject: Optional[str] = None
    pfp: Optional[str] = None

    reviews_written: list[ReviewResponse] = []
    reviews_received: list[ReviewResponse] = []
