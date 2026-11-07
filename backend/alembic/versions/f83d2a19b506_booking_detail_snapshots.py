"""Preserve booking subject and exact request-time quotes; no inferred backfill."""
from alembic import op
import sqlalchemy as sa

revision = "f83d2a19b506"
down_revision = "e47b901ad682"
branch_labels = None
depends_on = None


def upgrade():
    for column in (
        sa.Column("subject_id", sa.BigInteger(), nullable=True),
        sa.Column("subject_name_snapshot", sa.String(255), nullable=True),
        sa.Column("hourly_rate_snapshot", sa.Numeric(12, 2), nullable=True),
        sa.Column("currency_snapshot", sa.String(3), nullable=True),
        sa.Column("duration_minutes_snapshot", sa.SmallInteger(), nullable=True),
        sa.Column("session_amount_snapshot", sa.Numeric(12, 2), nullable=True),
    ):
        op.add_column("bookings", column)
    for name, condition in (
        ("booking_nonnegative_quote", "hourly_rate_snapshot >= 0 AND session_amount_snapshot >= 0"),
        ("booking_quote_currency", "currency_snapshot = 'USD'"),
        ("booking_quote_duration", "duration_minutes_snapshot = 60"),
        ("booking_quote_amount", "session_amount_snapshot = hourly_rate_snapshot"),
    ):
        op.create_check_constraint(name, "bookings", condition)


def downgrade():
    raise RuntimeError("Export historical booking quotes before a separately reviewed rollback")
