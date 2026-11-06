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

from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session
from fastapi import Depends, Query
from app.db.dependencies import get_db
from app.models.service_area import ServiceArea
from app.schemas.location import ServiceAreaResponse, SelectedPlaceArea
from app.services.geographic_names import geographic_display_name, name_key


@router.get("/areas", response_model=list[ServiceAreaResponse])
def search_areas(q: str = Query(min_length=2, max_length=100), db: Session = Depends(get_db)):
    # Independent catalog only. Google address text is never saved.
    query = " ".join(q.split()).lower()
    if len(query) < 2:
        raise HTTPException(422, "Enter at least two characters")
    # Normalization only removes terminal classifications, so original-name prefix
    # search also finds normalized names without a per-row SQL regex or extra column.
    import re
    region = re.fullmatch(r"(.+),\s*([a-z]{2})", query)
    filters = []
    if region:
        query = region[1].strip()
        filters = [ServiceArea.country == "US", func.upper(ServiceArea.region) == region[2].upper()]
    prefix = query.removesuffix(" (balance)")
    pattern = prefix.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
    return db.scalars(select(ServiceArea).where(*filters, or_(
        func.lower(ServiceArea.name).like(pattern, escape="\\"),
        ServiceArea.postal_code.like(pattern, escape="\\"),
    )).order_by(ServiceArea.name, ServiceArea.region).limit(20)).all()


@router.get("/areas/{area_id}", response_model=ServiceAreaResponse)
def get_area(area_id: str, db: Session = Depends(get_db)):
    area = db.get(ServiceArea, area_id)
    if not area:
        raise HTTPException(404, "Service area not found")
    return area


@router.post("/resolve", response_model=ServiceAreaResponse)
def resolve_selected_area(selection: SelectedPlaceArea, db: Session = Depends(get_db)):
    """Resolve a selected Google city/ZIP to an independent existing point.

    No Google data is saved; never silently pick the first prefix match.
    """
    if db.scalar(select(ServiceArea.id).limit(1)) is None:
        raise HTTPException(503, detail={"code": "LOCATION_CATALOG_UNAVAILABLE", "message": "Nearby search is not ready because the independent location catalog is not available yet. You can still search online tutors."})
    if selection.postal_code:
        areas = db.scalars(select(ServiceArea).where(
            ServiceArea.country == selection.country,
            ServiceArea.postal_code == selection.postal_code,
        ).limit(2)).all()
        if len(areas) == 1:
            return areas[0]
        if len(areas) > 1:
            raise HTTPException(409, "This ZIP area has multiple catalog entries. Please choose a city instead.")
    if selection.city and selection.region:
        city = name_key(selection.city)
        prefix = city.removesuffix(" (balance)")
        pattern = prefix.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        candidates = db.scalars(select(ServiceArea).where(
            ServiceArea.country == selection.country,
            func.upper(ServiceArea.region) == selection.region,
            ServiceArea.postal_code.is_(None),
            func.lower(ServiceArea.name).like(pattern, escape="\\"),
        ).limit(101)).all()
        # Only recognized Census place IDs/source can lose classifications.
        # Original names remain valid exact queries; never merge normalized collisions.
        exact = [area for area in candidates if city in (name_key(area.name), name_key(geographic_display_name(area)))]
        if len(exact) == 1 and len(candidates) <= 100:
            return exact[0]
        if len(exact) > 1 or len(candidates) > 100:
            raise HTTPException(409, "This city has multiple catalog entries. Please choose a ZIP code instead.")
    raise HTTPException(422, "This city or ZIP is not supported for nearby matching yet. Choose another location or search online tutors.")
