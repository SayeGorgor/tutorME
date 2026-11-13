from datetime import datetime
from decimal import Decimal
from typing import Literal
from pydantic import AwareDatetime, Field
from app.schemas.base import APIModel


class BookingCreate(APIModel):
    model_config = {**APIModel.model_config, "extra": "forbid"}
    subject_id: int = Field(gt=0)
    # Compare-only acknowledgement: never used to populate the server quote.
    expected_hourly_rate: Decimal = Field(ge=0, le=10000, decimal_places=2, allow_inf_nan=False)
    tutor_id: int = Field(gt=0)
    mode: Literal["online", "in-person"]
    starts_at: AwareDatetime
    idempotency_key: str = Field(min_length=16, max_length=80, pattern=r"^[a-zA-Z0-9-]+$")


class BookingAction(APIModel):
    action: Literal["confirm", "decline", "cancel", "complete"]


class MeetingDetails(APIModel):
    details: str = Field(min_length=1, max_length=1000)
    public_meeting_confirmed: bool = False


class BookingResponse(APIModel):
    id: str
    student_id: int
    tutor_id: int
    mode: str
    starts_at: datetime
    ends_at: datetime
    status: str
    meeting_details: str | None
    created_at: datetime
    student_name: str
    tutor_name: str

    subject_id: int | None = None
    subject_name_snapshot: str | None = None
    hourly_rate_snapshot: Decimal | None = None
    currency_snapshot: str | None = None
    duration_minutes_snapshot: int | None = None
    session_amount_snapshot: Decimal | None = None
