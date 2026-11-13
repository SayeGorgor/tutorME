"""Add independent service areas, tutor modes and subject associations.

Revision ID: c21a76e9d304
Revises: 81099c270fbc
"""

from alembic import op
import sqlalchemy as sa

revision = "c21a76e9d304"
down_revision = "81099c270fbc"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "service_areas",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("region", sa.String(80), nullable=False),
        sa.Column("country", sa.String(2), nullable=False),
        sa.Column("postal_code", sa.String(20)),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("source", sa.String(100), nullable=False),
        sa.CheckConstraint(
            "latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180",
            name="service_area_coordinates",
        ),
    )
    for column in ("name", "postal_code", "latitude"):
        op.create_index(f"ix_service_areas_{column}", "service_areas", [column])
    op.add_column(
        "tutor_profiles",
        sa.Column("online_enabled", sa.Boolean(), server_default=sa.true(), nullable=False),
    )
    op.add_column(
        "tutor_profiles",
        sa.Column("in_person_enabled", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.add_column("tutor_profiles", sa.Column("service_area_id", sa.String(80)))
    op.add_column("tutor_profiles", sa.Column("place_id", sa.String(255)))
    op.add_column(
        "tutor_profiles",
        sa.Column("travel_radius_miles", sa.Float(), server_default="25", nullable=False),
    )
    op.add_column("tutor_profiles", sa.Column("meeting_preferences", sa.String(500)))
    op.create_foreign_key(
        "fk_tutor_service_area", "tutor_profiles", "service_areas", ["service_area_id"], ["id"]
    )
    op.create_index("ix_tutor_profiles_service_area_id", "tutor_profiles", ["service_area_id"])
    op.create_check_constraint(
        "tutor_at_least_one_mode", "tutor_profiles", "online_enabled OR in_person_enabled"
    )
    op.create_check_constraint(
        "tutor_in_person_area",
        "tutor_profiles",
        "NOT in_person_enabled OR service_area_id IS NOT NULL",
    )
    op.create_check_constraint(
        "tutor_travel_radius", "tutor_profiles", "travel_radius_miles BETWEEN 0 AND 100"
    )
    op.create_table(
        "tutor_subjects",
        sa.Column(
            "tutor_id",
            sa.BigInteger(),
            sa.ForeignKey("tutor_profiles.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "subject_id",
            sa.BigInteger(),
            sa.ForeignKey("subjects.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )


def downgrade():
    # No automatic destructive rollback of profile preferences or catalog data.
    raise RuntimeError(
        "Review and export location data before writing an explicit rollback migration"
    )
