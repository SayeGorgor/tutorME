"""Explicit entrypoint, excluded from ordinary unittest discovery.

Applies real migrations to the marked, empty GitHub service, then tests that
schema directly. Never invokes ORM create_all or the Neon harness.
"""
import os
import unittest
from concurrent.futures import ThreadPoolExecutor
from contextlib import ExitStack
from datetime import datetime, timedelta, timezone
from threading import Barrier
from uuid import uuid4
from unittest.mock import patch

from scripts.container_guard import approved_container, container_engine, verify_container


def run():
    target = approved_container(os.environ)  # Fail before settings or database access.
    os.environ.update(DATABASE_URL="sqlite://", CSC_LOCATION_API_KEY="synthetic",
        CSC_API_URL="https://example.test", NEON_AUTH_BASE_URL="https://auth.example.test",
        NEON_AUTH_JWKS_URL="https://auth.example.test/jwks")
    from alembic import command
    from alembic.config import Config
    from alembic.migration import MigrationContext
    from alembic.script import ScriptDirectory
    from alembic.autogenerate import compare_metadata
    from sqlalchemy import select
    from sqlalchemy.orm import Session
    from fastapi import HTTPException
    from app.db.base import Base
    import app.models  # Register all tables, without creating them.
    from app.models.user import User, UserRole
    from app.models.tutor_profile import TutorProfile
    from app.models.tutor_availability import TutorAvailability
    from app.models.service_area import ServiceArea
    from app.models.subject import Subject, SubjectCategory
    from app.models.booking import Booking
    from app.schemas.booking import BookingCreate
    from app.services.bookings import submit, transition, participant
    from app.services.policies import TERMS_VERSION
    from app.core.config import settings

    engine = container_engine(target)
    try:
        with engine.connect() as connection:
            verify_container(connection, target, empty=True)
            cfg = Config("alembic.ini")
            cfg.attributes["connection"] = connection
            command.upgrade(cfg, "head")
            heads = MigrationContext.configure(connection).get_current_heads()
            if set(heads) != set(ScriptDirectory.from_config(cfg).get_heads()):
                raise RuntimeError("Migration revision mismatch")
            connection.rollback()
        print("Real Alembic chain applied; revision matches head", flush=True)

        class MigratedPostgreSQLTests(unittest.TestCase):
            def setUp(self):
                with engine.connect() as connection:
                    verify_container(connection, target)
                self.stack = ExitStack()
                self.addCleanup(self.stack.close)
                for key, value in dict(legal_operator_name="CI Test Operator",
                    legal_contact_email="ci@example.invalid", legal_effective_date="2026-11-05",
                    legal_publication_approved=True, bookings_enabled=True).items():
                    self.stack.enter_context(patch.object(settings, key, value))
                self.db = Session(engine)
                self.addCleanup(self.db.close)
                now = datetime.now(timezone.utc)
                self.start = (now + timedelta(days=2)).replace(hour=12, minute=0, second=0, microsecond=0)
                users = []
                for role in (UserRole.TUTOR, UserRole.TUTOR, UserRole.STUDENT, UserRole.STUDENT):
                    uid = uuid4().hex
                    user = User(auth_id=uid, email=f"{uid}@example.invalid", first_name="Synthetic", last_name="CI",
                        role=role, timezone="UTC", account_purpose="tutor" if role == UserRole.TUTOR else "self",
                        adult_attested_at=now, terms_version=TERMS_VERSION, terms_accepted_at=now)
                    self.db.add(user)
                    users.append(user)
                area = ServiceArea(id=uuid4().hex, name="CI Area", region="TS", country="US",
                    latitude=0, longitude=0, source="synthetic")
                subject = Subject(name=f"CI {uuid4().hex}", category=SubjectCategory.MATH)
                self.db.add_all([area, subject])
                self.db.flush()
                tutors = []
                for user in users[:2]:
                    tutor = TutorProfile(user=user, intro="CI", bio="Synthetic", price=30, subjects=[subject],
                        is_demo=False, online_enabled=True, in_person_enabled=True, service_area_id=area.id)
                    self.db.add(tutor)
                    self.db.flush()
                    self.db.add(TutorAvailability(tutor_id=tutor.id, type="custom", date=self.start.date().isoformat(),
                        start_time=600, end_time=960, timezone="UTC"))
                    tutors.append(tutor)
                self.db.commit()
                self.users, self.tutors, self.subject = users, tutors, subject

            def request(self, student_index, tutor_index, mode):
                return submit(self.db, self.users[student_index], BookingCreate(tutor_id=self.tutors[tutor_index].id,
                    mode=mode, subject_id=self.subject.id, expected_hourly_rate="30.00", starts_at=self.start,
                    idempotency_key=str(uuid4())))

            def test_schema_matches_models(self):
                with engine.connect() as connection:
                    verify_container(connection, target)
                    changes = compare_metadata(MigrationContext.configure(connection,
                        opts={"compare_type": True}), Base.metadata)
                    self.assertEqual(changes, [], "Migrated schema differs from ORM; do not stamp or ignore drift")

            def race(self, modes, cross_tutor=False):
                first = self.request(2, 0, modes[0])
                second = self.request(2 if cross_tutor else 3, 1 if cross_tutor else 0, modes[1])
                jobs = [(first.id, self.users[0].id), (second.id, self.users[1 if cross_tutor else 0].id)]
                # Release the parent session's read transaction before worker locks.
                self.db.rollback()
                barrier = Barrier(2, timeout=5)
                def confirm(job):
                    with engine.connect() as connection:
                        verify_container(connection, target)
                        with Session(connection) as db:
                            user = db.get(User, job[1])
                            barrier.wait()
                            try:
                                transition(db, user, job[0], "confirm")
                                return 200
                            except HTTPException as exc:
                                db.rollback()
                                # Confirm the failed transaction can still read.
                                db.execute(select(User.id).limit(1))
                                return exc.status_code
                with ThreadPoolExecutor(max_workers=2) as pool:
                    futures = [pool.submit(confirm, job) for job in jobs]
                    self.assertEqual(sorted(f.result(timeout=30) for f in futures), [200, 409])
                self.db.expire_all()
                rows = self.db.scalars(select(Booking).where(Booking.id.in_([j[0] for j in jobs]))).all()
                self.assertEqual(sorted(row.status for row in rows), ["confirmed", "pending"])
                for row in rows:
                    self.assertEqual(row.subject_id, self.subject.id)
                    self.assertEqual(str(row.session_amount_snapshot), "30.00")
                    self.assertEqual(row.currency_snapshot, "USD")
                    self.assertEqual(row.duration_minutes_snapshot, 60)

            def test_same_tutor_concurrency(self):
                self.race(("online", "online"))

            def test_mixed_format_concurrency(self):
                self.race(("online", "in-person"))

            def test_student_overlap_across_tutors(self):
                self.race(("online", "in-person"), cross_tutor=True)

            def test_role_and_cross_account_authorization(self):
                with self.assertRaises(HTTPException) as error:
                    self.request(0, 1, "online")
                self.assertEqual(error.exception.status_code, 403)
                self.db.rollback()
                booking = self.request(2, 0, "online")
                for actor, action, expected in ((self.users[2], "confirm", 403),
                                                 (self.users[3], "cancel", 404),
                                                 (self.users[1], "confirm", 404)):
                    with self.assertRaises(HTTPException) as error:
                        transition(self.db, actor, booking.id, action)
                    self.assertEqual(error.exception.status_code, expected)
                    self.db.rollback()
                with self.assertRaises(HTTPException) as error:
                    participant(self.db, self.users[3], booking.id)
                self.assertEqual(error.exception.status_code, 404)
                transition(self.db, self.users[0], booking.id, "confirm")
                transition(self.db, self.users[2], booking.id, "cancel")

        result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(MigratedPostgreSQLTests))
        return 0 if result.wasSuccessful() and result.testsRun == 5 and not result.skipped else 1
    finally:
        # Do not drop databases/schemas. GitHub removes only its own service
        # container (no volumes attached), including after failure/cancellation.
        engine.dispose()


if __name__ == "__main__":
    try:
        raise SystemExit(run())
    except Exception as error:
        print(f"Container integration failed: {type(error).__name__}", flush=True)
        raise SystemExit(1) from None
