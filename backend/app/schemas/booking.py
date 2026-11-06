from datetime import datetime
from typing import Literal
from pydantic import AwareDatetime, Field
from app.schemas.base import APIModel

class BookingCreate(APIModel):
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
