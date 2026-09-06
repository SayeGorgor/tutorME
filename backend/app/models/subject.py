from sqlalchemy import String, BigInteger, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

from enum import Enum

class SubjectCategory(str, Enum):
    MATH = "Math"
    COMPUTER_SCIENCE = "Computer Science"
    SAT_PREP = "SAT Prep"
    ACT_PREP = "ACT Prep"
    ENGLISH = "English"
    SCIENCE = "Science"
    SOCIAL_STUDIES = "Social Studies"
    OTHER = "Other"

class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(
        BigInteger, 
        primary_key=True, 
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        unique=True,
    )

    category: Mapped[SubjectCategory] = mapped_column(
        SQLEnum(
            SubjectCategory, 
            name="subject_category",
            values_callable=lambda enum: [
                member.value for member in enum
            ],
        ),
    )