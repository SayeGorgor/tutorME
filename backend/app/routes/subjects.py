from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.subject import Subject

router = APIRouter(
    prefix="/subjects",
    tags=["Subjects"]
)

@router.get("/")
def get_subjects(db: Session = Depends(get_db)):
    subjects = db.scalars(
        select(Subject).order_by(
            Subject.category, 
            Subject.name
        )
    ).all()
    
    return subjects

@router.get("/{category}")
def get_subjects_by_category(category: str, db: Session = Depends(get_db)):
    subjects = db.scalars(
        select(Subject).where(
            Subject.category == category
        )
    ).all()
    
    return subjects