from datetime import datetime
from decimal import Decimal
from sqlalchemy import BigInteger, String, DateTime, ForeignKey, CheckConstraint, UniqueConstraint, Index, func, Text, Numeric, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Booking(Base):
    __tablename__ = "bookings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    student_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="RESTRICT"))
    tutor_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("tutor_profiles.id", ondelete="RESTRICT"))
    # Historical identifier, intentionally not a cascading/live subject foreign key.
    subject_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    subject_name_snapshot: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hourly_rate_snapshot: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    currency_snapshot: Mapped[str | None] = mapped_column(String(3), nullable=True)
    duration_minutes_snapshot: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    session_amount_snapshot: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    mode: Mapped[str] = mapped_column(String(12))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(12), default="pending", server_default="pending")
    idempotency_key: Mapped[str] = mapped_column(String(80))
    meeting_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        CheckConstraint("hourly_rate_snapshot >= 0 AND session_amount_snapshot >= 0", name="booking_nonnegative_quote"),
        CheckConstraint("currency_snapshot = 'USD'", name="booking_quote_currency"),
        CheckConstraint("duration_minutes_snapshot = 60", name="booking_quote_duration"),
        CheckConstraint("session_amount_snapshot = hourly_rate_snapshot", name="booking_quote_amount"),
        CheckConstraint("ends_at > starts_at", name="booking_positive_duration"),
        CheckConstraint("mode IN ('online', 'in-person')", name="booking_mode"),
        CheckConstraint("status IN ('pending','confirmed','declined','cancelled','completed')", name="booking_status"),
        UniqueConstraint("student_id", "idempotency_key", name="uq_booking_request"),
        Index("ix_bookings_tutor_time", "tutor_id", "starts_at", "ends_at"),
        Index("ix_bookings_student_time", "student_id", "starts_at", "ends_at"),
    )


class DeletionRequest(Base):
    __tablename__ = "deletion_requests"
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), primary_key=True)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending")
