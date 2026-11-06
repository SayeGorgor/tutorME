from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4
from sqlalchemy import select, func, event
from app.main import app
from app.core.config import settings
from app.actions.actions import get_current_user, get_identity
from app.models.user import User, UserRole
from app.models.tutor_profile import TutorProfile
from app.models.tutor_availability import TutorAvailability
from app.models.booking import Booking, DeletionRequest
from app.services.policies import TERMS_VERSION
from app.services.bookings import local_instant
from zoneinfo import ZoneInfo
import unittest
import test_locations as fixtures


class MarketplaceTests(unittest.TestCase):
    def setUp(self):
        fixtures.LocationTests.setUp(self)
        self.config_patches = [patch.object(settings, name, value) for name, value in {
            "legal_operator_name": "Test Operator", "legal_contact_email": "privacy@example.test",
            "legal_effective_date": "2026-11-05", "legal_publication_approved": True, "bookings_enabled": True,
        }.items()]
        for item in self.config_patches: item.start()
        now = datetime.now(timezone.utc)
        for user in self.db.scalars(select(User)).all():
            user.adult_attested_at = now; user.terms_accepted_at = now; user.terms_version = TERMS_VERSION; user.account_purpose = "tutor"
        self.student = User(id=20, auth_id="adult-student", email="adult@example.test", first_name="Adult", last_name="Student", role=UserRole.STUDENT,
                            timezone="UTC", account_purpose="self", adult_attested_at=now, terms_version=TERMS_VERSION, terms_accepted_at=now)
        self.other = User(id=21, auth_id="other-adult", email="other@example.test", first_name="Other", last_name="Adult", role=UserRole.STUDENT,
                          timezone="UTC", account_purpose="self", adult_attested_at=now, terms_version=TERMS_VERSION, terms_accepted_at=now)
        self.db.add_all([self.student, self.other])
        self.start = (now + timedelta(days=2)).replace(hour=12, minute=0, second=0, microsecond=0)
        self.db.add(TutorAvailability(id=42, tutor_id=1, type="custom", date=self.start.date().isoformat(), start_time=600, end_time=960, timezone="UTC"))
        self.db.commit()
        self.actor(self.student)

    def tearDown(self):
        for item in reversed(self.config_patches): item.stop()
        fixtures.LocationTests.tearDown(self)

    def search(self, **params):
        return fixtures.LocationTests.search(self, **params)

    def actor(self, user):
        app.dependency_overrides[get_current_user] = lambda: user

    def create_booking(self, **overrides):
        return self.client.post("/api/bookings", json={"tutorId": 1, "mode": "online", "startsAt": self.start.isoformat(), "idempotencyKey": str(uuid4()), **overrides})

    def test_pending_confirm_private_details_and_cancel(self):
        response = self.create_booking(); self.assertEqual(response.status_code, 200, response.text)
        record = response.json(); self.assertEqual(record["status"], "pending")
        self.actor(self.db.get(User, 1))
        response = self.client.post(f"/api/bookings/{record['id']}/status", json={"action": "confirm"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["status"], "confirmed")
        response = self.client.put(f"/api/bookings/{record['id']}/meeting", json={"details": "https://meet.example.test/private-room"})
        self.assertEqual(response.status_code, 200, response.text)
        self.actor(self.student)
        self.assertEqual(self.client.get("/api/bookings").json()[0]["meetingDetails"], "https://meet.example.test/private-room")
        self.actor(self.other)
        self.assertEqual(self.client.get("/api/bookings").json(), [])
        self.assertEqual(self.client.post(f"/api/bookings/{record['id']}/status", json={"action": "cancel"}).status_code, 404)
        self.actor(self.student)
        response = self.client.post(f"/api/bookings/{record['id']}/status", json={"action": "cancel"})
        self.assertEqual(response.json()["status"], "cancelled"); self.assertIsNone(response.json()["meetingDetails"])
        self.assertNotIn("meetingDetails", self.client.get("/api/tutors/user/1").json())

    def test_double_confirmation_is_prevented(self):
        first = self.create_booking().json()
        self.actor(self.other); second = self.create_booking().json()
        self.actor(self.db.get(User, 1))
        self.assertEqual(self.client.post(f"/api/bookings/{first['id']}/status", json={"action":"confirm"}).status_code, 200)
        self.assertEqual(self.client.post(f"/api/bookings/{second['id']}/status", json={"action":"confirm"}).status_code, 409)
        self.actor(self.student)
        self.assertEqual(self.create_booking(startsAt=(self.start+timedelta(minutes=30)).isoformat()).status_code, 409)

    def test_idempotency_and_misuse(self):
        key = str(uuid4())
        first = self.create_booking(idempotencyKey=key).json()
        second = self.create_booking(idempotencyKey=key).json()
        self.assertEqual(first["id"], second["id"])
        self.assertEqual(self.create_booking(idempotencyKey=key, startsAt=(self.start+timedelta(hours=1)).isoformat()).status_code,409)

    def test_demo_never_accepts_direct_api_booking(self):
        self.db.get(TutorProfile,1).is_demo=True; self.db.commit()
        self.assertEqual(self.create_booking().status_code,403)
        self.assertEqual(self.db.scalar(select(func.count()).select_from(Booking)),0)
        self.assertTrue(self.client.get("/api/tutors/user/1").json()["isDemo"])
        self.assertFalse(self.client.get("/api/tutors/user/2").json()["isDemo"])

    def test_slots_validate_timezones_availability_and_conflicts(self):
        params={"day":self.start.date().isoformat(),"mode":"online","timezone":"America/New_York"}
        response=self.client.get("/api/bookings/slots/1",params=params)
        self.assertEqual(response.status_code,200,response.text); self.assertTrue(response.json()["slots"])
        self.assertEqual(self.client.get("/api/bookings/slots/1",params={**params,"timezone":"not-a-zone"}).status_code,422)
        self.assertEqual(self.create_booking(startsAt=(datetime.now(timezone.utc)-timedelta(days=1)).isoformat()).status_code,422)
        self.assertEqual(self.create_booking(startsAt=self.start.replace(hour=23).isoformat()).status_code,409)
        self.assertEqual(self.create_booking(mode="in-person").status_code,422)
        self.assertEqual(self.create_booking(startsAt=self.start.replace(tzinfo=None).isoformat()).status_code,422)

    def test_utc_equivalent_offsets_and_dst(self):
        response=self.create_booking(startsAt=self.start.astimezone(ZoneInfo("America/New_York")).isoformat())
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(datetime.fromisoformat(response.json()["startsAt"]),self.start)
        self.assertIsNone(local_instant(datetime(2027,3,14).date(),150,ZoneInfo("America/New_York")))
        self.assertIsNone(local_instant(datetime(2026,11,1).date(),90,ZoneInfo("America/New_York")))

    def test_transitions_and_tutor_only_actions(self):
        record=self.create_booking().json()
        self.assertEqual(self.client.post(f"/api/bookings/{record['id']}/status",json={"action":"confirm"}).status_code,403)
        self.actor(self.db.get(User,1))
        self.assertEqual(self.client.post(f"/api/bookings/{record['id']}/status",json={"action":"complete"}).status_code,409)
        self.assertEqual(self.client.post(f"/api/bookings/{record['id']}/status",json={"action":"decline"}).json()["status"],"declined")
        self.assertEqual(self.client.post(f"/api/bookings/{record['id']}/status",json={"action":"confirm"}).status_code,409)

    def test_private_in_person_meeting_details(self):
        tutor=self.db.get(TutorProfile,1); tutor.in_person_enabled=True;tutor.service_area_id="test-a";self.db.commit()
        record=self.create_booking(mode="in-person").json();self.actor(self.db.get(User,1))
        self.client.post(f"/api/bookings/{record['id']}/status",json={"action":"confirm"})
        path=f"/api/bookings/{record['id']}/meeting"
        self.assertEqual(self.client.put(path,json={"details":"Library front desk"}).status_code,422)
        self.assertEqual(self.client.put(path,json={"details":"Library front desk","publicMeetingConfirmed":True}).status_code,200)
        self.actor(self.other);self.assertEqual(self.client.put(path,json={"details":"Private"}).status_code,404)

    def test_eligibility_missing_and_guardian_fail_closed(self):
        self.student.adult_attested_at=None;self.db.commit();self.assertEqual(self.create_booking().status_code,403)
        self.student.adult_attested_at=datetime.now(timezone.utc);self.student.account_purpose="guardian";self.db.commit()
        self.assertEqual(self.create_booking().status_code,403)
        # No child profile endpoint or independent child login exists.
        self.assertEqual(self.client.post("/api/students",json={"name":"child"}).status_code,404)

    def test_registration_enforces_adult_terms_identity_and_role(self):
        app.dependency_overrides[get_identity]=lambda:{"sub":"new-adult","name":"New Adult","email":"newadult@example.test","emailVerified":True}
        payload={"authId":"new-adult","email":"newadult@example.test","firstName":"New","lastName":"Adult","role":"student","timezone":"UTC","adultConfirmed":True,"termsAccepted":True,"termsVersion":TERMS_VERSION,"accountPurpose":"self"}
        for invalid in [{"adultConfirmed":False},{"termsAccepted":False},{"termsVersion":"old"},{"role":"admin"},{"adultConfirmed":"true"}]:
            self.assertEqual(self.client.post("/api/users/",json={**payload,**invalid}).status_code,422)
        self.assertEqual(self.client.post("/api/users/",json={**payload,"authId":"someone-else"}).status_code,403)
        self.assertEqual(self.client.post("/api/users/",json={**payload,"accountPurpose":"guardian"}).status_code,200)
        created=self.db.scalar(select(User).where(User.auth_id=="new-adult"));self.assertIsNotNone(created.terms_accepted_at)

    def test_existing_account_can_attest_without_session_replacement(self):
        self.student.adult_attested_at=None;self.student.terms_version=None;self.db.commit()
        response=self.client.post("/api/users/eligibility",json={"adultConfirmed":True,"termsAccepted":True,"termsVersion":TERMS_VERSION,"accountPurpose":"self"})
        self.assertEqual(response.status_code,200,response.text);self.assertEqual(response.json()["id"],self.student.id)

    def test_deletion_is_authenticated_owned_idempotent_and_non_destructive(self):
        self.assertEqual(self.client.post("/api/users/me/deletion-request").json()["status"],"pending")
        self.client.post("/api/users/me/deletion-request")
        self.assertEqual(self.db.scalar(select(func.count()).select_from(DeletionRequest)),1)
        self.assertIsNotNone(self.db.get(User,self.student.id))
        self.assertEqual(self.create_booking().status_code,403)
        self.actor(self.other);self.assertEqual(self.client.get("/api/users/me/deletion-request").json()["status"],"not_requested")
        app.dependency_overrides.pop(get_current_user)
        self.assertIn(self.client.post("/api/users/me/deletion-request").status_code,[401,403])

    def test_unpublished_policies_gate_new_features_not_existing_reads(self):
        with patch.object(settings,"legal_publication_approved",False):
            self.assertFalse(self.client.get("/api/policies").json()["ready"])
            self.assertEqual(self.create_booking().status_code,503)
            self.assertEqual(self.client.get("/api/users/me").status_code,200)
        with patch.object(settings,"bookings_enabled",False):
            self.assertEqual(self.create_booking().status_code,503)

    def test_bad_availability_rejected(self):
        self.actor(self.db.get(User,1))
        for row in [{"type":"weekly","dayOfTheWeek":9,"startTime":600,"endTime":660,"timezone":"UTC"}, {"type":"custom","date":"wrong","startTime":600,"endTime":660,"timezone":"UTC"}]:
            self.assertEqual(self.client.put("/api/tutors/1/availability",json={"availability":[row]}).status_code,422)

    def test_demo_seed_is_opt_in_idempotent_and_preserves_real_profiles(self):
        from scripts.seed import seed_tutor_profiles
        next_id = [1000]
        @event.listens_for(self.db, "before_flush")
        def allocate_demo_fixture_ids(session, *_):
            for obj in session.new:
                if isinstance(obj, (User, TutorProfile)):
                    next_id[0] += 1; obj.id = next_id[0]
        real = self.db.get(TutorProfile, 1)
        original = (real.intro, real.bio, real.user_id)
        seed_tutor_profiles(self.db); self.db.commit()
        seed_tutor_profiles(self.db); self.db.commit()
        demos = self.db.scalars(select(TutorProfile).where(TutorProfile.is_demo.is_(True))).all()
        self.assertEqual(len(demos), 2)
        self.assertEqual((real.intro, real.bio, real.user_id), original)
        self.assertFalse(real.is_demo)

    def test_finished_and_started_cancellation_rules(self):
        record = self.create_booking().json()
        booking = self.db.get(Booking, record["id"])
        booking.status = "confirmed"
        booking.starts_at = datetime.now(timezone.utc) - timedelta(hours=2)
        booking.ends_at = datetime.now(timezone.utc) - timedelta(hours=1)
        self.db.commit()
        self.assertEqual(self.client.post(f"/api/bookings/{record['id']}/status", json={"action":"cancel"}).status_code,409)
        self.actor(self.db.get(User,1))
        self.assertEqual(self.client.post(f"/api/bookings/{record['id']}/status", json={"action":"complete"}).json()["status"],"completed")

    def test_public_tutor_payload_does_not_expose_email_or_acceptance(self):
        user = self.client.get("/api/tutors/user/1").json()["user"]
        self.assertNotIn("email", user)
        self.assertNotIn("termsVersion", user)
        self.assertNotIn("adultAttestedAt", user)
