"""Explicitly opt-in live test. Never run against the protected inspected branch.
All ordinary source/unit-test runs skip this; no environment setting is changed.
"""

import os
import time
import multiprocessing
import unittest
from uuid import uuid4
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from contextlib import ExitStack
from sqlalchemy.schema import CreateSchema, DropSchema
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.db.base import Base
from app.models.user import User, UserRole
from app.models.tutor_profile import TutorProfile
from app.models.tutor_availability import TutorAvailability
from app.models.subject import Subject, SubjectCategory
from app.models.booking import Booking
from app.models.service_area import ServiceArea
from app.services.bookings import transition, submit
from app.schemas.booking import BookingCreate
from app.services.policies import TERMS_VERSION
from app.core.config import settings
from postgres_test_guard import approved_target, test_engine, verify_connection

SYNC_TIMEOUT = 5
WORKER_DEADLINE = 30


def confirm_worker(
    environment, schema, student_id, tutor_id, mode, starts_at, barrier, results, actor_id=1
):
    engine = None
    try:
        target = approved_target(environment)
        engine = test_engine(target)
        with engine.connect() as connection:
            verify_connection(connection, target)
            connection = connection.execution_options(schema_translate_map={None: schema})
            with Session(connection) as db, ExitStack() as stack:
                for key, value in {
                    "legal_operator_name": "Test Operator",
                    "legal_contact_email": "test@example.invalid",
                    "legal_effective_date": "2026-11-05",
                    "legal_publication_approved": True,
                    "bookings_enabled": True,
                }.items():
                    stack.enter_context(patch.object(settings, key, value))
                student = db.get(User, student_id)
                barrier.wait(timeout=SYNC_TIMEOUT)  # Competing requests start together.
                booking = submit(
                    db,
                    student,
                    BookingCreate(
                        tutor_id=tutor_id,
                        mode=mode,
                        subject_id=1,
                        expected_hourly_rate="30.00",
                        starts_at=datetime.fromisoformat(starts_at),
                        idempotency_key=str(uuid4()),
                    ),
                )
                identifier = booking.id
                barrier.wait(
                    timeout=SYNC_TIMEOUT
                )  # Both requests must be pending before confirmation.
                user = db.get(User, actor_id)
                try:
                    transition(db, user, str(identifier), "confirm")
                    results.put({"request": 200, "confirmation": 200})
                except HTTPException as exc:
                    db.rollback()
                    db.execute(
                        text("SELECT 1")
                    )  # A rolled-back loser must have a usable transaction.
                    db.rollback()
                    results.put({"request": 200, "confirmation": exc.status_code})
    except Exception as exc:
        results.put(
            "worker_error:" + type(exc).__name__
        )  # Never include credentials/driver messages.
    finally:
        if engine is not None:
            engine.dispose()


def stop_workers(workers):
    # A separate process can be terminated even if a driver/network call stops returning.
    for worker in workers:
        if worker.pid is None:
            continue
        if worker.is_alive():
            worker.terminate()
        worker.join(timeout=5)
        if worker.is_alive():
            worker.kill()
            worker.join(timeout=5)
        if worker.is_alive():
            raise RuntimeError("A test worker did not stop; do not drop its schema automatically")


@unittest.skipUnless(
    os.environ.get("TUTORME_RUN_POSTGRES_TESTS") == "1",
    "Live PostgreSQL concurrency test was not explicitly requested",
)
class PostgreSQLConcurrencyTests(unittest.TestCase):
    def test_only_one_overlapping_request_can_be_confirmed(self):
        self._race(("online", "online"))

    def test_online_and_in_person_compete_for_same_tutor(self):
        self._race(("online", "in-person"))

    def test_student_cannot_confirm_overlapping_different_tutors(self):
        self._race(("online", "in-person"), cross_tutor=True)

    def _race(self, modes, cross_tutor=False):
        environment = dict(os.environ)
        target = approved_target(
            environment
        )  # All approvals checked BEFORE connection/schema creation.
        engine = test_engine(target)
        schema = "tutorme_test_" + uuid4().hex
        created = False
        workers = []
        results = None
        try:
            with engine.connect() as connection:
                verify_connection(
                    connection, target
                )  # Actual IDs verified read-only on this connection.
                connection = connection.execution_options(schema_translate_map={None: schema})
                with connection.begin():
                    connection.execute(CreateSchema(schema))
                    Base.metadata.create_all(connection)
                created = True
                now = datetime.now(timezone.utc)
                start = (now + timedelta(days=2)).replace(
                    hour=12, minute=0, second=0, microsecond=0
                )
                with Session(connection) as db:
                    for uid, role, purpose in [
                        (1, UserRole.TUTOR, "tutor"),
                        (2, UserRole.STUDENT, "self"),
                        (3, UserRole.STUDENT, "self"),
                        (4, UserRole.TUTOR, "tutor"),
                    ]:
                        db.add(
                            User(
                                id=uid,
                                auth_id=f"test-{uid}",
                                email=f"test-{uid}@example.invalid",
                                first_name="Test",
                                last_name=str(uid),
                                role=role,
                                timezone="UTC",
                                account_purpose=purpose,
                                adult_attested_at=now,
                                terms_version=TERMS_VERSION,
                                terms_accepted_at=now,
                            )
                        )
                    db.flush()
                    db.add(
                        ServiceArea(
                            id="synthetic-test-area",
                            name="Synthetic test area",
                            region="TS",
                            country="US",
                            latitude=0,
                            longitude=0,
                            source="isolated test fixture",
                        )
                    )
                    db.flush()
                    subject = Subject(id=1, name="Synthetic math", category=SubjectCategory.MATH)
                    db.add(subject)
                    db.flush()
                    for tutor_id in (1, 4):
                        db.add(
                            TutorProfile(
                                id=tutor_id,
                                user_id=tutor_id,
                                intro="Test",
                                bio="Test",
                                price=30,
                                is_demo=False,
                                subjects=[subject],
                                online_enabled=True,
                                in_person_enabled=True,
                                service_area_id="synthetic-test-area",
                            )
                        )
                    db.flush()
                    for tutor_id in (1, 4):
                        db.add(
                            TutorAvailability(
                                id=tutor_id,
                                tutor_id=tutor_id,
                                type="custom",
                                date=start.date().isoformat(),
                                start_time=600,
                                end_time=960,
                                timezone="UTC",
                            )
                        )
                    db.commit()
            context = multiprocessing.get_context("spawn")
            barrier = context.Barrier(2, timeout=SYNC_TIMEOUT)
            results = context.Queue()
            workers = [
                context.Process(
                    target=confirm_worker,
                    args=(
                        environment,
                        schema,
                        2 if cross_tutor else identifier,
                        4 if cross_tutor and index == 1 else 1,
                        modes[index],
                        start.isoformat(),
                        barrier,
                        results,
                        4 if cross_tutor and index == 1 else 1,
                    ),
                )
                for index, identifier in enumerate((2, 3))
            ]
            for worker in workers:
                worker.start()
            deadline = time.monotonic() + WORKER_DEADLINE
            for worker in workers:
                worker.join(timeout=max(0, deadline - time.monotonic()))
            if any(worker.is_alive() for worker in workers):
                raise TimeoutError("Concurrent confirmations exceeded the bounded worker deadline")
            statuses = [results.get(timeout=SYNC_TIMEOUT) for _ in workers]
            self.assertTrue(
                all(
                    isinstance(status, dict) and status.get("request") == 200 for status in statuses
                ),
                "A request worker failed; inspect approved-target connectivity and logs",
            )
            self.assertEqual(sorted(status["confirmation"] for status in statuses), [200, 409])
            with engine.connect() as connection:
                verify_connection(connection, target)
                connection = connection.execution_options(schema_translate_map={None: schema})
                with Session(connection) as db:
                    records = db.scalars(select(Booking)).all()
                    self.assertEqual(len(records), 2)
                    self.assertEqual(
                        sorted(record.status for record in records), ["confirmed", "pending"]
                    )
                    for record in records:
                        self.assertEqual(record.subject_id, 1)
                        self.assertEqual(record.subject_name_snapshot, "Synthetic math")
                        self.assertEqual(str(record.hourly_rate_snapshot), "30.00")
                        self.assertEqual(str(record.session_amount_snapshot), "30.00")
                        self.assertEqual(record.currency_snapshot, "USD")
                        self.assertEqual(record.duration_minutes_snapshot, 60)
                    # No partially changed loser or duplicate confirmed row survived.
                    db.rollback()
        finally:
            try:
                stop_workers(
                    workers
                )  # Never drop a schema while a local test worker is still active.
                if created:
                    with engine.connect() as connection:
                        verify_connection(
                            connection, target
                        )  # Refuse cleanup on a changed/mismatched endpoint.
                        with connection.begin():
                            connection.execute(DropSchema(schema, cascade=True))
            finally:
                if results is not None:
                    results.close()
                    results.join_thread()
                engine.dispose()
