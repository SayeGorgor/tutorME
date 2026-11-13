from app.schemas.base import APIModel
from datetime import datetime, date
from pydantic import Field, model_validator
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


class TutorAvailabilityBase(APIModel):
    type: Literal["weekly", "custom"]
    day_of_the_week: int | None = None
    date: str | None = None
    start_time: int = Field(ge=0, lt=1440)
    end_time: int = Field(gt=0, le=1440)
    timezone: str

    @model_validator(mode="after")
    def validate_window(self):
        if self.start_time >= self.end_time or self.start_time % 30 or self.end_time % 30:
            raise ValueError("Use increasing half-hour time boundaries")
        if self.type == "weekly":
            if (
                self.date is not None
                or self.day_of_the_week is None
                or not 0 <= self.day_of_the_week <= 6
            ):
                raise ValueError("Weekly availability requires one weekday (0-6), without a date")
        elif self.day_of_the_week is not None or not self.date:
            raise ValueError("Custom availability requires a date without a weekday")
        else:
            date.fromisoformat(self.date)

        try:
            ZoneInfo(self.timezone)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Invalid time zone")

        return self


class TutorAvailability(TutorAvailabilityBase):
    id: int
    tutor_id: int
    created_at: datetime


class TutorAvailabilitySummary(APIModel):
    id: int
    type: str
    tutor_id: int
    day_of_the_week: int | None = None
    date: str | None = None
    start_time: int
    end_time: int
    timezone: str


class TutorAvailabilityCreate(APIModel):
    availability: list[TutorAvailabilityBase] = Field(max_length=336)


class TutorAvailabilityResponse(APIModel):
    availability: list[TutorAvailability]
