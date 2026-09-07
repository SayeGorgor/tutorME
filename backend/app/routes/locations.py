import httpx

from fastapi import APIRouter, HTTPException
from app.core.config import settings

router = APIRouter(
    prefix="/locations",
    tags=["locations"]
)

# @router.get("/")
# return {"message": "Locations API is working!"}

@router.get("/search")
async def get_locations(s: str = None):
    response = httpx.get(
        f"{settings.csc_api_url}/search/autocomplete",
        params={"q": s} if s else None,
        headers={"X-CSCAPI-KEY": settings.csc_location_api_key}
    )
    return response.json()