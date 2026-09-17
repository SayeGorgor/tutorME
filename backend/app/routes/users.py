import logging

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserResponse, UserCreate

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.post('/', response_model=UserResponse)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    new_user = User(
        auth_id=user_data.auth_id,
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
        timezone=user_data.timezone
    )
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    except Exception as e:
        db.rollback()
        logger.exception("Error creating user: %s", user_data.auth_id)
        raise HTTPException(status_code=500, detail="Unable to create your account, please try again.")