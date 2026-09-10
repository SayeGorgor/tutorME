from sqlalchemy import BigInteger, String, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

from enum import Enum

class UserRole(str, Enum):
    STUDENT = "student"
    TUTOR = "tutor"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        BigInteger, 
        primary_key=True, 
        autoincrement=True,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
    )

    first_name: Mapped[str] = mapped_column(
        String(255),
    )

    last_name: Mapped[str] = mapped_column(
        String(255),
    )

    phone_number: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=True,
    )

    role: Mapped[UserRole] = mapped_column(
        SQLEnum(
            UserRole,
            name="user_role",
            values_callable=lambda enum: [
                member.value for member in enum
            ],
        ),
        nullable=False,
    )

    timezone: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default="America/New_York",
        server_default="America/New_York"
    )

    reviews_written: Mapped[list["Review"]] = relationship(
        foreign_keys="Review.author_id",
        back_populates="author",
    )

    reviews_received: Mapped[list["Review"]] = relationship(
        foreign_keys="Review.tutor_id",
        back_populates="tutor",
    )

    tutor_profile: Mapped["TutorProfile"] = relationship(
        foreign_keys="TutorProfile.user_id",
        back_populates="user",
    )