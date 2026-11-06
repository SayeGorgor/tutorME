from sqlalchemy import BigInteger, String, ForeignKey, func, DateTime, Float, Boolean, CheckConstraint, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

tutor_subjects = Table(
    "tutor_subjects", Base.metadata,
    Column("tutor_id", BigInteger, ForeignKey("tutor_profiles.id", ondelete="CASCADE"), primary_key=True),
    Column("subject_id", BigInteger, ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True),
)

class TutorProfile(Base):
    __tablename__ = "tutor_profiles"

    id: Mapped[int] = mapped_column(
        BigInteger, 
        primary_key=True, 
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
    )

    intro: Mapped[str] = mapped_column(
        String(255),
    )

    bio: Mapped[str] = mapped_column(
        String(1000),
    )

    price: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    online_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    in_person_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    service_area_id: Mapped[str | None] = mapped_column(ForeignKey("service_areas.id"), nullable=True, index=True)
    place_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    travel_radius_miles: Mapped[float] = mapped_column(Float, default=25, server_default="25")
    meeting_preferences: Mapped[str | None] = mapped_column(String(500), nullable=True)
    service_area: Mapped["ServiceArea"] = relationship()
    subjects: Mapped[list["Subject"]] = relationship(secondary=tutor_subjects)
    __table_args__ = (
        CheckConstraint("online_enabled OR in_person_enabled", name="tutor_at_least_one_mode"),
        CheckConstraint("NOT in_person_enabled OR service_area_id IS NOT NULL", name="tutor_in_person_area"),
        CheckConstraint("travel_radius_miles BETWEEN 0 AND 100", name="tutor_travel_radius"),
    )

    availability: Mapped[list["TutorAvailability"]] = relationship(
        back_populates="tutor",
        cascade="all, delete-orphan"
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now()
    )

    user: Mapped["User"] = relationship(
        foreign_keys=[user_id], 
        back_populates="tutor_profile",
    )