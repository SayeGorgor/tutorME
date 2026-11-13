from sqlalchemy import String, Float, CheckConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class ServiceArea(Base):
    """Independent public Census representative point, never a residential address."""

    __tablename__ = "service_areas"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)

    name: Mapped[str] = mapped_column(String(255))

    region: Mapped[str] = mapped_column(String(80))

    country: Mapped[str] = mapped_column(String(2), default="US")

    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)

    latitude: Mapped[float] = mapped_column(Float)

    longitude: Mapped[float] = mapped_column(Float)

    source: Mapped[str] = mapped_column(String(100))

    __table_args__ = (
        CheckConstraint(
            "latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180",
            name="service_area_coordinates",
        ),
        Index("ix_service_areas_name", "name"),
        Index("ix_service_areas_postal_code", "postal_code"),
        Index("ix_service_areas_latitude", "latitude"),
    )
