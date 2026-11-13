from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, func, text
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from pydantic import Field, field_validator
from hashlib import sha256

from app.db.dependencies import get_db
from app.models.subject import Subject, SubjectCategory
from app.models.user import User, UserRole
from app.actions.actions import get_current_user
from app.schemas.base import APIModel
from app.schemas.tutor import SubjectSummary

router = APIRouter(prefix="/subjects", tags=["Subjects"])


class CustomSubject(APIModel):
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value):
        value = " ".join(value.split())

        if not value or any(ord(char) < 32 for char in value):
            raise ValueError("Enter a subject name")

        return value


@router.post("/", response_model=SubjectSummary)
def add_subject(
    data: CustomSubject, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    if user.role != UserRole.TUTOR:
        raise HTTPException(403, "Only tutors can add teaching subjects")

    normalized = data.name.lower()

    def existing():
        return db.scalar(
            select(Subject)
            .where(func.lower(Subject.name) == normalized)
            .order_by(Subject.id)
            .limit(1)
        )

    try:
        if db.get_bind().dialect.name == "postgresql":
            # Serialize case variants across this endpoint without changing the schema.
            lock_id = int.from_bytes(sha256(normalized.encode()).digest()[:8], "big", signed=True)
            db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": lock_id})

        subject = existing()

        if subject:
            return subject

        subject = Subject(name=data.name, category=SubjectCategory.OTHER)

        db.add(subject)
        db.commit()
        db.refresh(subject)

        return subject
    except IntegrityError:
        db.rollback()

        subject = existing()

        if subject:
            return subject

        raise HTTPException(
            409, "This subject could not be added. Refresh the choices and try again."
        ) from None
    except SQLAlchemyError:
        db.rollback()

        raise HTTPException(
            503, "Subject choices could not be updated. Please try again."
        ) from None


@router.get("/")
def get_subjects(db: Session = Depends(get_db)):
    subjects = db.scalars(select(Subject).order_by(Subject.category, Subject.name)).all()

    return subjects


@router.get("/{category}")
def get_subjects_by_category(category: str, db: Session = Depends(get_db)):
    subjects = db.scalars(select(Subject).where(Subject.category == category)).all()

    return subjects
