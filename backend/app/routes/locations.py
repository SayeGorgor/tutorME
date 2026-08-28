from fastapi import APIRouter

router = APIRouter(
    prefix="/api/locations",
    tags=["locations"]
)

@router.get("/")
async def get_locations():
    return {"message": "Locations endpoint is working!"}