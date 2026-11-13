"""Synthetic SQLite/API regressions; no configured database or provider calls."""

import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4
from sqlalchemy import select, func
from app.models.booking import Booking
from app.models.subject import Subject, SubjectCategory
from app.models.tutor_profile import TutorProfile
from app.models.user import User
import test_marketplace as fixtures


class BookingSnapshotTests(unittest.TestCase):
    setUp = fixtures.MarketplaceTests.setUp
    tearDown = fixtures.MarketplaceTests.tearDown
    actor = fixtures.MarketplaceTests.actor
    create_booking = fixtures.MarketplaceTests.create_booking

    def prepare(self, rate="25.10"):
        self.subject = Subject(id=900, name="SAT Math", category=SubjectCategory.MATH)
        self.second = Subject(id=901, name="English", category=SubjectCategory.ENGLISH)
        self.db.add_all([self.subject, self.second])
        self.tutor = self.db.get(TutorProfile, 1)
        self.tutor.subjects = [self.subject, self.second]
        self.tutor.price = float(rate)
        self.db.commit()

    def request(self, **overrides):
        return self.create_booking(expectedHourlyRate="25.10", **overrides)

    def snapshots(self, record):
        return {
            key: record[key]
            for key in (
                "subjectId",
                "subjectNameSnapshot",
                "hourlyRateSnapshot",
                "currencySnapshot",
                "durationMinutesSnapshot",
                "sessionAmountSnapshot",
            )
        }

    def test_authoritative_exact_snapshot_and_private_response(self):
        self.prepare()
        response = self.request()
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            self.snapshots(response.json()),
            dict(
                subjectId=900,
                subjectNameSnapshot="SAT Math",
                hourlyRateSnapshot="25.10",
                currencySnapshot="USD",
                durationMinutesSnapshot=60,
                sessionAmountSnapshot="25.10",
            ),
        )
        self.assertEqual(
            self.db.get(Booking, response.json()["id"]).session_amount_snapshot, Decimal("25.10")
        )
        self.actor(self.other)
        self.assertEqual(self.client.get("/api/bookings").json(), [])

    def test_missing_unassigned_and_arbitrary_pricing_rejected(self):
        self.prepare()
        base = dict(
            tutorId=1,
            mode="online",
            startsAt=self.start.isoformat(),
            idempotencyKey=str(uuid4()),
            expectedHourlyRate="25.10",
        )
        self.assertEqual(self.client.post("/api/bookings", json=base).status_code, 422)
        missing_rate = {**base, "subjectId": 900}
        missing_rate.pop("expectedHourlyRate")
        self.assertEqual(self.client.post("/api/bookings", json=missing_rate).status_code, 422)
        self.tutor.subjects = [self.subject]
        self.db.commit()
        self.assertEqual(self.request(subjectId=901).status_code, 409)
        self.assertEqual(self.request(subjectId=999).status_code, 409)
        self.tutor.subjects = []
        self.db.commit()
        self.assertEqual(self.request().status_code, 409)
        self.tutor.subjects = [self.subject]
        self.db.commit()
        for extras in (
            {"hourlyRateSnapshot": "0.01"},
            {"sessionAmountSnapshot": "0.01"},
            {"currency": "EUR"},
            {"durationMinutesSnapshot": 30},
            {"expectedHourlyRate": "25.101"},
        ):
            self.assertEqual(
                self.client.post(
                    "/api/bookings", json={**base, "subjectId": 900, **extras}
                ).status_code,
                422,
            )
        self.assertEqual(self.db.scalar(select(func.count()).select_from(Booking)), 0)

    def test_stale_rate_requires_explicit_refresh_not_silent_increase(self):
        self.prepare("35.00")
        response = self.request()
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["detail"]["code"], "QUOTE_CHANGED")
        self.assertEqual(self.db.scalar(select(func.count()).select_from(Booking)), 0)
        self.assertEqual(
            self.create_booking(expectedHourlyRate="35.00").json()["hourlyRateSnapshot"], "35.00"
        )

    def test_retry_keeps_original_quote_after_rate_and_subject_changes(self):
        self.prepare()
        key = str(uuid4())
        original = self.request(idempotencyKey=key).json()
        self.tutor.price = 35
        self.tutor.subjects = []
        self.subject.name = "New name"
        self.db.commit()
        retry = self.request(idempotencyKey=key)
        self.assertEqual(retry.status_code, 200, retry.text)
        self.assertEqual(retry.json(), original)
        self.assertEqual(self.request(idempotencyKey=key, subjectId=901).status_code, 409)
        self.assertEqual(
            self.create_booking(idempotencyKey=key, expectedHourlyRate="35.00").status_code, 409
        )
        self.assertEqual(self.db.scalar(select(func.count()).select_from(Booking)), 1)

    def test_same_time_pending_request_different_subject_or_rate_conflicts(self):
        self.prepare()
        original = self.request().json()
        self.assertEqual(self.request().json()["id"], original["id"])
        self.assertEqual(self.request(subjectId=901).status_code, 409)
        self.tutor.price = 35
        self.db.commit()
        self.assertEqual(self.create_booking(expectedHourlyRate="35.00").status_code, 409)

    def test_subject_deletion_preserves_id_name_retry_and_confirmation(self):
        self.prepare()
        key = str(uuid4())
        original = self.request(idempotencyKey=key).json()
        self.tutor.subjects = []
        self.db.commit()
        # Physically remove the subject rather than merely unassigning it.
        self.db.delete(self.subject)
        self.db.commit()
        self.assertEqual(self.request(idempotencyKey=key).json(), original)
        self.actor(self.db.get(User, 1))
        accepted = self.client.post(
            f"/api/bookings/{original['id']}/status", json={"action": "confirm"}
        )
        self.assertEqual(accepted.status_code, 200, accepted.text)
        self.assertEqual(self.snapshots(accepted.json()), self.snapshots(original))

    def test_profile_edits_and_all_statuses_preserve_snapshots(self):
        for action in ("confirm", "decline", "cancel", "complete"):
            with self.subTest(action=action):
                # Use separate non-overlapping instants for these independent bookings.
                if not hasattr(self, "subject"):
                    self.prepare()
                self.actor(self.student)
                record = self.request(
                    startsAt=(
                        self.start
                        + timedelta(
                            hours=("confirm", "decline", "cancel", "complete").index(action)
                        )
                    ).isoformat()
                ).json()
                self.actor(self.db.get(User, 1))
                response = self.client.patch(
                    "/api/tutors/user/1", json={"price": "35.00", "subjectIds": []}
                )
                self.assertEqual(response.status_code, 200, response.text)
                booking = self.db.get(Booking, record["id"])
                if action == "complete":
                    booking.status = "confirmed"
                    booking.starts_at = datetime.now(timezone.utc) - timedelta(hours=2)
                    booking.ends_at = datetime.now(timezone.utc) - timedelta(hours=1)
                    self.db.commit()
                response = self.client.post(
                    f"/api/bookings/{record['id']}/status", json={"action": action}
                )
                self.assertEqual(response.status_code, 200, response.text)
                self.assertEqual(self.snapshots(response.json()), self.snapshots(record))
                self.assertEqual(
                    self.snapshots(self.client.get("/api/bookings").json()[0])
                    if action != "complete"
                    else self.snapshots(response.json()),
                    self.snapshots(record),
                )
                self.tutor.price = 25.1
                self.tutor.subjects = [self.subject, self.second]
                self.db.commit()

    def test_legacy_records_do_not_infer_current_profile_details(self):
        self.prepare()
        record = Booking(
            id=str(uuid4()),
            student_id=20,
            tutor_id=1,
            mode="online",
            starts_at=self.start,
            ends_at=self.start + timedelta(hours=1),
            status="pending",
            idempotency_key=str(uuid4()),
        )
        self.db.add(record)
        self.db.commit()
        payload = self.client.get("/api/bookings").json()[0]
        self.assertTrue(all(value is None for value in self.snapshots(payload).values()))
        self.actor(self.db.get(User, 1))
        result = self.client.post(f"/api/bookings/{record.id}/status", json={"action": "confirm"})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertTrue(all(value is None for value in self.snapshots(result.json()).values()))

    def test_fractional_cent_profile_cannot_create_rounded_quote(self):
        self.prepare("25.105")
        self.assertEqual(self.request().status_code, 409)
        self.actor(self.db.get(User, 1))
        self.assertEqual(
            self.client.patch("/api/tutors/user/1", json={"price": "25.105"}).status_code, 422
        )
        self.assertEqual(
            self.client.patch("/api/tutors/user/1", json={"price": None}).status_code, 422
        )

    def test_zero_and_cent_rates(self):
        self.prepare("0.10")
        first = self.create_booking(expectedHourlyRate="0.10")
        self.assertEqual(first.json()["sessionAmountSnapshot"], "0.10")
        self.tutor.price = 0
        self.db.commit()
        result = self.create_booking(
            expectedHourlyRate="0", startsAt=(self.start + timedelta(hours=1)).isoformat()
        )
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()["hourlyRateSnapshot"], "0.00")


class SnapshotMigrationTests(unittest.TestCase):
    def test_additive_postgres_sql_and_linear_head(self):
        import importlib.util
        import io
        from pathlib import Path
        from alembic.config import Config
        from alembic.script import ScriptDirectory
        from alembic.migration import MigrationContext
        from alembic.operations import Operations

        path = (
            Path(__file__).resolve().parents[1]
            / "alembic/versions/f83d2a19b506_booking_detail_snapshots.py"
        )
        spec = importlib.util.spec_from_file_location("snapshot_revision", path)
        revision = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(revision)
        output = io.StringIO()
        context = MigrationContext.configure(
            dialect_name="postgresql", opts={"as_sql": True, "output_buffer": output}
        )
        revision.op = Operations(context)
        revision.upgrade()
        sql = output.getvalue()
        self.assertEqual(sql.count("ADD COLUMN"), 6)
        for name in (
            "subject_id",
            "subject_name_snapshot",
            "hourly_rate_snapshot",
            "currency_snapshot",
            "duration_minutes_snapshot",
            "session_amount_snapshot",
        ):
            self.assertIn("ADD COLUMN " + name, sql)
            self.assertTrue(Booking.__table__.c[name].nullable)
        for destructive in ("DROP ", "UPDATE ", "DELETE ", "NOT NULL", "DEFAULT"):
            self.assertNotIn(destructive, sql)
        self.assertIn("NUMERIC(12, 2)", sql)
        self.assertIn("booking_quote_amount", sql)
        config = Config(str(path.parents[2] / "alembic.ini"))
        config.set_main_option("script_location", str(path.parents[1]))
        scripts = ScriptDirectory.from_config(config)
        self.assertEqual(scripts.get_heads(), [revision.revision])
        self.assertEqual(scripts.get_revision(revision.revision).down_revision, "e47b901ad682")
