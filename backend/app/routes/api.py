from fastapi import APIRouter

from app.routes.locations import router as locations_router
from app.routes.subjects import router as subjects_router
from app.routes.tutors import router as tutors_router

api_router = APIRouter(prefix="/api")

api_router.include_router(locations_router)
api_router.include_router(subjects_router)
api_router.include_router(tutors_router)