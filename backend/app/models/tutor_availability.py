from enum import Enum

from sqlalchemy import (
    BigInteger,
    String,
    DateTime,
    ForeignKey,
    CheckConstraint,
    func,
    Enum as SQLEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AvailabilityType(str, Enum):
    WEEKLY = "weekly"

    CUSTOM = "custom"


class TutorAvailability(Base):
    __tablename__ = "tutor_availabilities"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    tutor_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("tutor_profiles.id"))

    type: Mapped[AvailabilityType] = mapped_column(
        SQLEnum(
            AvailabilityType,
            name="availability_type",
            values_callable=lambda enum: [member.value for member in enum],
        ),
        nullable=False,
    )

    day_of_the_week: Mapped[int] = mapped_column(nullable=True)

    date: Mapped[String] = mapped_column(String(255), nullable=True)

    start_time: Mapped[int] = mapped_column(nullable=False)

    end_time: Mapped[int] = mapped_column(nullable=False)

    timezone: Mapped[String] = mapped_column(
        String(255), nullable=False, default="America/New_York"
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=func.now(), server_default=func.now()
    )

    tutor: Mapped["TutorProfile"] = relationship("TutorProfile", back_populates="availability")

    __table_args__ = (
        CheckConstraint(
            "(day_of_the_week IS NOT NULL) <> (date IS NOT NULL)", name="check_dotw_xor_date"
        ),
    )
