"""Isolated booking and target-guard regressions; no live PostgreSQL calls."""
import unittest
from datetime import datetime, timedelta, timezone
from tempfile import TemporaryDirectory
from pathlib import Path
from unittest.mock import Mock, patch
from sqlalchemy import select, func, event
from pydantic import ValidationError
import test_marketplace as fixtures
from app.core.config import settings, Settings
from app.models.booking import Booking, DeletionRequest
from app.models.user import User
from app.models.tutor_profile import TutorProfile
from app.models.tutor_availability import TutorAvailability
from app.services.bookings import effective_status
from postgres_test_guard import approved_target, verify_connection, DEVELOPMENT_BRANCH, DEVELOPMENT_ENDPOINT

class BookingReadinessTests(unittest.TestCase):
    setUp=fixtures.MarketplaceTests.setUp
    tearDown=fixtures.MarketplaceTests.tearDown
    actor=fixtures.MarketplaceTests.actor
    create_booking=fixtures.MarketplaceTests.create_booking

    def modes(self):
        tutor=self.db.get(TutorProfile,1);tutor.in_person_enabled=True;tutor.service_area_id="test-a";self.db.commit()

    def test_pending_is_not_a_hold_and_confirmation_blocks_both_modes(self):
        self.modes();first=self.create_booking().json()
        self.actor(self.other);second=self.create_booking(mode="in-person").json()
        params={"day":self.start.date().isoformat(),"mode":"in-person","timezone":"UTC"}
        self.assertIn(self.start,[datetime.fromisoformat(value) for value in self.client.get("/api/bookings/slots/1",params=params).json()["slots"]])
        self.actor(self.db.get(User,1))
        self.assertEqual(self.client.post(f"/api/bookings/{first['id']}/status",json={"action":"confirm"}).status_code,200)
        self.assertEqual(self.client.post(f"/api/bookings/{second['id']}/status",json={"action":"confirm"}).status_code,409)
        self.db.rollback();self.assertEqual(self.db.get(Booking,second["id"]).status,"pending")
        self.assertEqual(self.db.scalar(select(func.count()).select_from(Booking).where(Booking.status=="confirmed")),1)
        self.assertNotIn(self.start,[datetime.fromisoformat(value) for value in self.client.get("/api/bookings/slots/1",params=params).json()["slots"]])

    def test_student_conflict_across_different_tutors_and_modes(self):
        first=self.create_booking().json()
        self.db.add(TutorAvailability(id=99,tutor_id=3,type="custom",date=self.start.date().isoformat(),start_time=600,end_time=960,timezone="UTC"));self.db.commit()
        second=self.create_booking(tutorId=3,mode="in-person").json()
        self.actor(self.db.get(User,1));self.assertEqual(self.client.post(f"/api/bookings/{first['id']}/status",json={"action":"confirm"}).status_code,200)
        self.actor(self.db.get(User,3));self.assertEqual(self.client.post(f"/api/bookings/{second['id']}/status",json={"action":"confirm"}).status_code,409)

    def test_expired_pending_requests_do_not_exhaust_cap_and_reads_do_not_rewrite(self):
        past=datetime.now(timezone.utc)-timedelta(days=2)
        for number in range(20):
            self.db.add(Booking(id=f"expired-{number}",student_id=self.student.id,tutor_id=1,mode="online",starts_at=past,ends_at=past+timedelta(hours=1),status="pending",idempotency_key=f"expired-key-{number}"))
        self.db.commit()
        self.assertEqual(self.create_booking().status_code,200)
        records=self.client.get("/api/bookings").json()
        self.assertEqual(sum(row["status"]=="expired" for row in records),20)
        self.assertEqual(self.db.get(Booking,"expired-0").status,"pending")
        self.actor(self.db.get(User,1))
        self.assertEqual(self.client.post("/api/bookings/expired-0/status",json={"action":"confirm"}).status_code,409)

    def test_future_pending_cap_still_applies(self):
        start=self.start+timedelta(hours=1)
        for number in range(20):
            self.db.add(Booking(id=f"future-{number}",student_id=self.student.id,tutor_id=1,mode="online",starts_at=start,ends_at=start+timedelta(hours=1),status="pending",idempotency_key=f"future-key-{number}"))
        self.db.commit();self.assertEqual(self.create_booking().status_code,429)

    def test_expiry_boundary_does_not_change_confirmed_state(self):
        booking=Booking(status="pending",starts_at=self.start)
        self.assertEqual(effective_status(booking,self.start-timedelta(microseconds=1)),"pending")
        self.assertEqual(effective_status(booking,self.start),"expired")
        booking.status="confirmed";self.assertEqual(effective_status(booking,self.start),"confirmed")

    def test_disabled_flag_blocks_slots_create_confirm_but_allows_cancel_and_history(self):
        booking=self.create_booking().json()
        self.actor(self.db.get(User,1))
        with patch.object(settings,"bookings_enabled",False):
            self.assertEqual(self.client.get("/api/bookings/slots/1",params={"day":self.start.date().isoformat(),"mode":"online"}).status_code,503)
            self.assertEqual(self.client.post(f"/api/bookings/{booking['id']}/status",json={"action":"confirm"}).status_code,503)
            self.actor(self.student)
            self.assertEqual(self.create_booking().status_code,503)
            self.assertEqual(self.client.get("/api/bookings").status_code,200)
            self.assertEqual(self.client.post(f"/api/bookings/{booking['id']}/status",json={"action":"cancel"}).json()["status"],"cancelled")

    def test_deleting_tutor_no_longer_offers_slots(self):
        self.db.add(DeletionRequest(user_id=1,status="under_review"));self.db.commit()
        self.assertEqual(self.client.get("/api/bookings/slots/1",params={"day":self.start.date().isoformat(),"mode":"online"}).status_code,409)

    def test_weekly_availability_uses_its_own_zone(self):
        from zoneinfo import ZoneInfo
        local=self.start.astimezone(ZoneInfo("America/Los_Angeles"));minutes=local.hour*60
        self.actor(self.db.get(User,1))
        @event.listens_for(self.db,"before_flush")
        def sqlite_availability_id(session,*_):
            for row in session.new:
                if isinstance(row,TutorAvailability) and row.id is None:row.id=100
        response=self.client.put("/api/tutors/1/availability",json={"availability":[{"type":"weekly","dayOfTheWeek":(local.weekday()+1)%7,"startTime":minutes,"endTime":minutes+120,"timezone":"America/Los_Angeles"}]})
        self.assertEqual(response.status_code,200,response.text)
        self.actor(self.student);self.assertEqual(self.create_booking().status_code,200)

    def test_extreme_viewer_zone_includes_two_day_offset_availability(self):
        from datetime import time
        from zoneinfo import ZoneInfo
        day=self.start.date()
        start=datetime.combine(day,time(0,30),tzinfo=ZoneInfo("Pacific/Kiritimati")).astimezone(timezone.utc)
        self.db.add(TutorAvailability(id=100,tutor_id=1,type="custom",date=(day-timedelta(days=2)).isoformat(),start_time=1350,end_time=1440,timezone="Etc/GMT+12"));self.db.commit()
        response=self.client.get("/api/bookings/slots/1",params={"day":day.isoformat(),"mode":"online","timezone":"Pacific/Kiritimati"})
        self.assertEqual(response.status_code,200,response.text)
        self.assertIn(start,[datetime.fromisoformat(value) for value in response.json()["slots"]])
        self.assertEqual(self.create_booking(startsAt=start.isoformat()).status_code,200)

    def test_confirmation_rechecks_changed_availability(self):
        booking=self.create_booking().json();self.actor(self.db.get(User,1))
        self.assertEqual(self.client.put("/api/tutors/1/availability",json={"availability":[]}).status_code,200)
        self.assertEqual(self.client.post(f"/api/bookings/{booking['id']}/status",json={"action":"confirm"}).status_code,409)
        self.assertEqual(self.db.get(Booking,booking["id"]).status,"pending")

    def test_demo_blocks_confirmation_and_slots_even_with_global_flag_enabled(self):
        booking=self.create_booking().json()
        self.db.get(TutorProfile,1).is_demo=True;self.db.commit();self.actor(self.db.get(User,1))
        self.assertEqual(self.client.post(f"/api/bookings/{booking['id']}/status",json={"action":"confirm"}).status_code,403)
        self.assertEqual(self.client.get("/api/bookings/slots/1",params={"day":self.start.date().isoformat(),"mode":"online"}).status_code,403)

class TargetAndSettingsTests(unittest.TestCase):
    def environment(self):
        return dict(TUTORME_RUN_POSTGRES_TESTS="1",TUTORME_TEST_DATABASE_IS_DISPOSABLE="1",TUTORME_TEST_PROJECT_ID="synthetic",TUTORME_TEST_BRANCH_ID="br-disposable",TUTORME_TEST_DATABASE_NAME="neondb",TUTORME_TEST_DATABASE_URL="postgresql+psycopg://test:private@ep-disposable.example/neondb?sslmode=require")

    def test_established_dev_is_rejected_before_connecting(self):
        env=self.environment()
        with self.assertRaises(RuntimeError):approved_target({**env,"TUTORME_TEST_BRANCH_ID":DEVELOPMENT_BRANCH})
        with self.assertRaises(RuntimeError):approved_target({**env,"TUTORME_TEST_DATABASE_URL":f"postgresql+psycopg://test:private@{DEVELOPMENT_ENDPOINT}.example/neondb?sslmode=require"})

    def test_actual_dev_rejected_even_with_misleading_url(self):
        target=approved_target(self.environment());conn=Mock();conn.scalar.return_value="on"
        conn.execute.return_value.one.return_value=(target.project,DEVELOPMENT_BRANCH,target.database)
        with self.assertRaises(RuntimeError):verify_connection(conn,target)
        conn.rollback.assert_called_once()

    def test_test_dotenv_keys_do_not_break_app_or_enable_booking(self):
        with TemporaryDirectory() as folder:
            path=Path(folder)/"synthetic.env"
            path.write_text("\n".join(f"{key}={value}" for key,value in self.environment().items()))
            app_settings=Settings(_env_file=path,database_url="sqlite://",csc_location_api_key="test",csc_api_url="https://example.test",neon_auth_base_url="https://auth.example.test",neon_auth_jwks_url="https://auth.example.test/jwks",bookings_enabled=False)
            self.assertFalse(app_settings.bookings_enabled)
            self.assertFalse(hasattr(app_settings,"tutorme_test_database_url"))
            path.write_text("UNKNOWN_SECRET=synthetic-secret-value")
            with self.assertRaises(ValidationError) as error:Settings(_env_file=path,database_url="sqlite://",csc_location_api_key="test",csc_api_url="https://example.test",neon_auth_base_url="https://auth.example.test",neon_auth_jwks_url="https://auth.example.test/jwks")
            self.assertNotIn("synthetic-secret-value",str(error.exception))
