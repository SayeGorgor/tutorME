from sqlalchemy import String, BigInteger, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(
        BigInteger, 
        primary_key=True, 
        autoincrement=True,
    )

    author_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id"),
    )

    tutor_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id"),
    )

    rating: Mapped[int] = mapped_column(
        BigInteger,
    )

    comment: Mapped[str] = mapped_column(
        String(1000),
    )

    author: Mapped["User"] = relationship(
        foreign_keys=[author_id],
        back_populates="reviews_written"
    )
    tutor: Mapped["User"] = relationship(
        foreign_keys=[tutor_id],
        back_populates="reviews_received"
    )