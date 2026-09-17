from sqlalchemy import BigInteger, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

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
        nullable=False
    )

    availability: Mapped[list["TutorAvailability"]] = relationship(
        back_populates="tutor",
        cascade="all, delete-orphan"
    )

    user: Mapped["User"] = relationship(
        foreign_keys=[user_id], 
        back_populates="tutor_profile",
    )