from sqlalchemy import BigInteger, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

class TutorAvailability(Base):
    __tablename__ = "tutor_availabilities"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    tutor_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("tutor_profiles.id")
    )

    day_of_week: Mapped[int] = mapped_column(
        nullable=False
    )

    start_time: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    end_time: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    timezone: Mapped[String] = mapped_column(
        String,
        nullable=False,
        default="America/New_York"
    )

    tutor: Mapped["TutorProfile"] = relationship(
        "TutorProfile",
        back_populates="availability"
    )