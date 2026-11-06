"""Add adult acknowledgments, demo flags, bookings and deletion requests.
No existing user's age, acceptance or demo status is inferred.
"""
from alembic import op
import sqlalchemy as sa
revision = "e47b901ad682"
down_revision = "c21a76e9d304"
branch_labels = None
depends_on = None

def upgrade():
    for column in [sa.Column("account_purpose", sa.String(20)), sa.Column("adult_attested_at", sa.DateTime(timezone=True)),
                   sa.Column("terms_version", sa.String(80)), sa.Column("terms_accepted_at", sa.DateTime(timezone=True))]:
        op.add_column("users", column)
    op.add_column("tutor_profiles", sa.Column("is_demo", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.create_table("bookings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("student_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("tutor_id", sa.BigInteger(), sa.ForeignKey("tutor_profiles.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("mode", sa.String(12), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(12), nullable=False, server_default="pending"),
        sa.Column("idempotency_key", sa.String(80), nullable=False),
        sa.Column("meeting_details", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("ends_at > starts_at", name="booking_positive_duration"),
        sa.CheckConstraint("mode IN ('online', 'in-person')", name="booking_mode"),
        sa.CheckConstraint("status IN ('pending','confirmed','declined','cancelled','completed')", name="booking_status"),
        sa.UniqueConstraint("student_id", "idempotency_key", name="uq_booking_request"),
    )
    op.create_index("ix_bookings_tutor_time", "bookings", ["tutor_id", "starts_at", "ends_at"])
    op.create_index("ix_bookings_student_time", "bookings", ["student_id", "starts_at", "ends_at"])
    op.create_table("deletion_requests",
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="RESTRICT"), primary_key=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
    )

def downgrade():
    raise RuntimeError("Review and export account and appointment data before an explicit rollback migration")
