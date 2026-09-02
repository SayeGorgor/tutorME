from fastapi import APIRouter, HTTPException
from backend.app.actions.location_actions import haversine_distance

router = APIRouter(
    prefix="/tutors",
    tags=["Tutors"]
)

@router.get("/distance")
def get_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
):
    distance = haversine_distance(lat1, lon1, lat2, lon2)
    return {"distance": distance}