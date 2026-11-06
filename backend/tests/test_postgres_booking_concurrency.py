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
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.db.base import Base
from app.models.user import User, UserRole
from app.models.tutor_profile import TutorProfile
from app.models.tutor_availability import TutorAvailability
from app.models.booking import Booking
from app.services.bookings import transition
from app.services.policies import TERMS_VERSION
from app.core.config import settings
from postgres_test_guard import approved_target, test_engine, verify_connection

SYNC_TIMEOUT = 5
WORKER_DEADLINE = 30


def confirm_worker(environment, schema, identifier, barrier, results):
    engine = None
    try:
        target = approved_target(environment)
        engine = test_engine(target)
        with engine.connect() as connection:
            verify_connection(connection, target)
            connection = connection.execution_options(schema_translate_map={None: schema})
            with Session(connection) as db, ExitStack() as stack:
                for key, value in {'legal_operator_name': 'Test Operator', 'legal_contact_email': 'test@example.invalid',
                    'legal_effective_date': '2026-11-05', 'legal_publication_approved': True, 'bookings_enabled': True}.items():
                    stack.enter_context(patch.object(settings, key, value))
                user = db.get(User, 1)
                barrier.wait(timeout=SYNC_TIMEOUT)
                try:
                    transition(db, user, str(identifier), 'confirm')
                    results.put(200)
                except HTTPException as exc:
                    db.rollback()
                    results.put(exc.status_code)
    except Exception as exc:
        results.put('worker_error:' + type(exc).__name__)  # Never include credentials/driver messages.
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
            raise RuntimeError('A test worker did not stop; do not drop its schema automatically')


@unittest.skipUnless(os.environ.get('TUTORME_RUN_POSTGRES_TESTS') == '1', 'Live PostgreSQL concurrency test was not explicitly requested')
class PostgreSQLConcurrencyTests(unittest.TestCase):
    def test_only_one_overlapping_request_can_be_confirmed(self):
        environment = dict(os.environ)
        target = approved_target(environment)  # All approvals checked BEFORE connection/schema creation.
        engine = test_engine(target)
        schema = 'tutorme_test_' + uuid4().hex
        created = False
        workers = []
        results = None
        try:
            with engine.connect() as connection:
                verify_connection(connection, target)  # Actual IDs verified read-only on this connection.
                connection = connection.execution_options(schema_translate_map={None: schema})
                with connection.begin():
                    connection.execute(CreateSchema(schema))
                    Base.metadata.create_all(connection)
                created = True
                now = datetime.now(timezone.utc)
                start = (now + timedelta(days=2)).replace(hour=12, minute=0, second=0, microsecond=0)
                with Session(connection) as db:
                    for uid, role, purpose in [(1, UserRole.TUTOR, 'tutor'), (2, UserRole.STUDENT, 'self'), (3, UserRole.STUDENT, 'self')]:
                        db.add(User(id=uid, auth_id=f'test-{uid}', email=f'test-{uid}@example.invalid', first_name='Test', last_name=str(uid),
                            role=role, timezone='UTC', account_purpose=purpose, adult_attested_at=now, terms_version=TERMS_VERSION, terms_accepted_at=now))
                    db.flush()
                    db.add(TutorProfile(id=1, user_id=1, intro='Test', bio='Test', price=30, is_demo=False, online_enabled=True, in_person_enabled=False))
                    db.flush()
                    db.add(TutorAvailability(id=1, tutor_id=1, type='custom', date=start.date().isoformat(), start_time=600, end_time=960, timezone='UTC'))
                    for student in (2, 3):
                        db.add(Booking(id=str(student), student_id=student, tutor_id=1, mode='online', starts_at=start,
                            ends_at=start+timedelta(hours=1), status='pending', idempotency_key=str(uuid4())))
                    db.commit()
            context = multiprocessing.get_context('spawn')
            barrier = context.Barrier(2, timeout=SYNC_TIMEOUT)
            results = context.Queue()
            workers = [context.Process(target=confirm_worker, args=(environment, schema, student, barrier, results)) for student in (2, 3)]
            for worker in workers:
                worker.start()
            deadline = time.monotonic() + WORKER_DEADLINE
            for worker in workers:
                worker.join(timeout=max(0, deadline-time.monotonic()))
            if any(worker.is_alive() for worker in workers):
                raise TimeoutError('Concurrent confirmations exceeded the bounded worker deadline')
            statuses = [results.get(timeout=SYNC_TIMEOUT) for _ in workers]
            self.assertTrue(all(isinstance(status, int) for status in statuses), 'A confirmation worker failed; inspect approved-target connectivity and logs')
            self.assertEqual(sorted(statuses), [200, 409])
        finally:
            try:
                stop_workers(workers)  # Never drop a schema while a local test worker is still active.
                if created:
                    with engine.connect() as connection:
                        verify_connection(connection, target)  # Refuse cleanup on a changed/mismatched endpoint.
                        with connection.begin():
                            connection.execute(DropSchema(schema, cascade=True))
            finally:
                if results is not None:
                    results.close()
                    results.join_thread()
                engine.dispose()
