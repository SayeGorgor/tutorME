from sqlalchemy import select, func, or_, and_, literal, case
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException
from app.models.tutor_profile import TutorProfile
from app.models.service_area import ServiceArea
from app.models.subject import Subject
from app.schemas.location import TutorSearch
from app.schemas.tutor import TutorSearchItem


def search_tutors(db: Session, params: TutorSearch):
    area = db.get(ServiceArea, params.area_id) if params.area_id else None
    if params.area_id and area is None:
        raise HTTPException(422, "Unknown service area. Select an area from the location catalog.")
    distance = literal(None)
    nearby = literal(False)
    if area:
        # Spherical great-circle miles between independent public area points, not driving distance.
        cosine = (func.sin(func.radians(area.latitude)) * func.sin(func.radians(ServiceArea.latitude))
                  + func.cos(func.radians(area.latitude)) * func.cos(func.radians(ServiceArea.latitude))
                  * func.cos(func.radians(ServiceArea.longitude - area.longitude)))
        distance = case(
            (and_(ServiceArea.latitude == area.latitude, ServiceArea.longitude == area.longitude), 0.0),
            else_=3958.8 * func.acos(func.least(1.0, func.greatest(-1.0, cosine))),
        )
        nearby = and_(
            TutorProfile.in_person_enabled.is_(True),
            ServiceArea.latitude.between(area.latitude - params.radius / 69.0, area.latitude + params.radius / 69.0),
            distance <= params.radius + 1e-6,
            distance <= TutorProfile.travel_radius_miles + 1e-6,
        )
    offering_in_person = TutorProfile.in_person_enabled.is_(True) if area is None else nearby
    mode = {"online": TutorProfile.online_enabled.is_(True), "in-person": nearby,
            "all": or_(TutorProfile.online_enabled.is_(True), offering_in_person)}[params.mode]
    criteria = [mode, TutorProfile.price.between(params.min_price, params.max_price)]
    if params.subject:
        criteria.append(TutorProfile.subjects.any(func.lower(Subject.name) == params.subject.lower()))
    base = select(TutorProfile).outerjoin(ServiceArea, TutorProfile.service_area_id == ServiceArea.id).where(*criteria)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.add_columns(distance.label("distance"), nearby.label("nearby"))
        .options(selectinload(TutorProfile.user), selectinload(TutorProfile.availability),
                 selectinload(TutorProfile.subjects), selectinload(TutorProfile.service_area))
        .order_by(TutorProfile.id).offset(params.offset).limit(params.limit)).all()
    items = []
    for tutor, miles, matches in rows:
        item = TutorSearchItem.model_validate(tutor)
        item.distance_miles = round(miles, 2) if miles is not None and tutor.in_person_enabled else None
        item.in_person_match = bool(matches)
        items.append(item)
    return {"items": items, "total": total, "limit": params.limit, "offset": params.offset}
