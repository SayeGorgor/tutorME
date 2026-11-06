from fastapi import APIRouter

from app.routes.health import router as health_router
from app.routes.locations import router as locations_router
from app.routes.subjects import router as subjects_router
from app.routes.tutors import router as tutors_router
from app.routes.users import router as users_router

from app.routes.policies import router as policies_router
from app.routes.sessions import router as sessions_router

api_router = APIRouter(prefix="/api")

api_router.include_router(locations_router)
api_router.include_router(subjects_router)
api_router.include_router(tutors_router)
api_router.include_router(users_router)
api_router.include_router(health_router)
api_router.include_router(policies_router)
api_router.include_router(sessions_router)
