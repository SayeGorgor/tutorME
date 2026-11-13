"""Isolated tests: never connects to the configured PostgreSQL database."""

import os

os.environ.update(
    DATABASE_URL="sqlite://",
    CSC_LOCATION_API_KEY="test",
    CSC_API_URL="https://example.test",
    NEON_AUTH_BASE_URL="https://auth.example.test",
    NEON_AUTH_JWKS_URL="https://auth.example.test/jwks",
)
import math
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from sqlalchemy import create_engine, event, select, func
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from app.main import app
from app.db.base import Base
from app.db.dependencies import get_db
from app.actions.actions import get_current_user, get_identity
from unittest.mock import patch
from app.core.config import settings
from app.services.policies import TERMS_VERSION
from app.models.user import User, UserRole
from app.models.tutor_profile import TutorProfile
from app.models.service_area import ServiceArea
from app.models.subject import Subject, SubjectCategory
from app.schemas.location import LocationPreferences
from app.schemas.tutor import TutorProfileResponse
from scripts.import_service_areas import read_areas


class LocationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
        )

        @event.listens_for(self.engine, "connect")
        def functions(connection, _):
            for name, count, fn in [
                ("radians", 1, math.radians),
                ("sin", 1, math.sin),
                ("cos", 1, math.cos),
                ("acos", 1, math.acos),
                ("least", 2, min),
                ("greatest", 2, max),
            ]:
                connection.create_function(
                    name, count, lambda *args, f=fn: None if None in args else f(*args)
                )

        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.area = ServiceArea(
            id="test-a",
            name="Synthetic Area A",
            region="TEST",
            country="US",
            latitude=0,
            longitude=0,
            source="synthetic test fixture",
        )
        self.near = ServiceArea(
            id="test-b",
            name="Synthetic Area B",
            region="TEST",
            country="US",
            latitude=0.1,
            longitude=0,
            source="synthetic test fixture",
        )
        self.far = ServiceArea(
            id="test-c",
            name="Synthetic Area C",
            region="TEST",
            country="US",
            latitude=20,
            longitude=20,
            source="synthetic test fixture",
        )
        self.db.add_all([self.area, self.near, self.far])
        for number, online, person, area, radius in [
            (1, True, False, None, 25),
            (2, False, True, self.near, 25),
            (3, True, True, self.far, 25),
            (4, False, True, self.near, 1),
        ]:
            user = User(
                id=number,
                auth_id=f"user-{number}",
                email=f"u{number}@example.test",
                first_name="Test",
                last_name=str(number),
                role=UserRole.TUTOR,
                timezone="UTC",
            )
            self.db.add(
                TutorProfile(
                    id=number,
                    user=user,
                    intro="",
                    bio="",
                    price=30,
                    online_enabled=online,
                    in_person_enabled=person,
                    service_area=area,
                    travel_radius_miles=radius,
                )
            )
        self.db.commit()

        @event.listens_for(self.db, "before_flush")
        def assign_test_ids(session, *_):
            for obj in session.new:
                if isinstance(obj, (User, TutorProfile)) and obj.id is None:
                    obj.id = 100  # SQLite fixture substitute for PostgreSQL bigint sequences.

        self.owner = self.db.get(User, 2)
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    def search(self, **params):
        response = self.client.get("/api/tutors/search", params=params)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_online_does_not_require_location(self):
        self.assertEqual([t["id"] for t in self.search(mode="online")["items"]], [1, 3])

    def test_all_without_location_includes_all_offerings(self):
        self.assertEqual(self.search()["total"], 4)

    def test_hybrid_keeps_remote_online_tutors(self):
        result = self.search(mode="all", areaId="test-a", radius=10)
        self.assertEqual([t["id"] for t in result["items"]], [1, 2, 3])
        self.assertEqual([t["id"] for t in result["items"] if t["inPersonMatch"]], [2])

    def test_in_person_both_travel_limits_apply(self):
        self.assertEqual(
            [t["id"] for t in self.search(mode="in-person", areaId="test-a", radius=10)["items"]],
            [2],
        )
        self.assertEqual(self.search(mode="in-person", areaId="test-a", radius=5)["total"], 0)

    def test_zero_radius_same_point(self):
        result = self.search(mode="in-person", areaId="test-b", radius=0)
        self.assertEqual([t["id"] for t in result["items"]], [2, 4])

    def test_zero_radius_at_non_equatorial_point(self):
        self.near.latitude, self.near.longitude = 51.25, -0.75
        self.db.commit()
        self.assertEqual(self.search(mode="in-person", areaId="test-b", radius=0)["total"], 2)

    def test_invalid_search(self):
        for params in [
            {"mode": "in-person"},
            {"radius": -1},
            {"radius": "nan"},
            {"limit": 51},
            {"offset": -1},
            {"minPrice": 100, "maxPrice": 10},
            {"mode": "foo"},
            {"areaId": "missing"},
        ]:
            response = self.client.get("/api/tutors/search", params=params)
            self.assertEqual(response.status_code, 422, response.text)

    def test_price_and_subject_filters(self):
        subject = Subject(id=1, name="Calculus", category=SubjectCategory.MATH)
        self.db.get(TutorProfile, 2).subjects = [subject]
        self.db.commit()
        self.assertEqual(self.search(subject="calculus")["total"], 1)
        self.assertEqual(self.search(maxPrice=20)["total"], 0)

    def test_pagination_and_legacy_array(self):
        self.assertEqual(self.search(limit=1, offset=1)["items"][0]["id"], 2)
        self.assertEqual(self.search(limit=1)["total"], 4)
        self.assertIsInstance(self.client.get("/api/tutors/").json(), list)

    def test_unauthenticated_cannot_write(self):
        self.assertIn(
            self.client.put("/api/tutors/user/2/location", json={}).status_code, [401, 403]
        )

    def preferences(self, **extra):
        return {
            "onlineEnabled": False,
            "inPersonEnabled": True,
            "serviceAreaId": "test-a",
            "publicAreaConsent": True,
            "travelRadiusMiles": 15,
            **extra,
        }

    def test_owner_can_save(self):
        app.dependency_overrides[get_current_user] = lambda: self.owner
        response = self.client.put("/api/tutors/user/2/location", json=self.preferences())
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["serviceArea"]["id"], "test-a")

    def test_cannot_edit_another_tutor_or_availability(self):
        app.dependency_overrides[get_current_user] = lambda: self.db.get(User, 1)
        self.assertEqual(
            self.client.put("/api/tutors/user/2/location", json=self.preferences()).status_code, 403
        )
        self.assertEqual(
            self.client.patch("/api/tutors/user/2", json={"bio": "changed"}).status_code, 403
        )
        self.assertEqual(
            self.client.put("/api/tutors/2/availability", json={"availability": []}).status_code,
            403,
        )

    def test_student_cannot_save_even_own_profile(self):
        app.dependency_overrides[get_current_user] = lambda: User(id=2, role=UserRole.STUDENT)
        self.assertEqual(
            self.client.put("/api/tutors/user/2/location", json=self.preferences()).status_code, 403
        )

    def test_validation_and_no_arbitrary_addresses(self):
        app.dependency_overrides[get_current_user] = lambda: self.owner
        for changes in [
            {"onlineEnabled": False, "inPersonEnabled": False},
            {"serviceAreaId": None},
            {"publicAreaConsent": False},
            {"travelRadiusMiles": 101},
            {"serviceAreaId": "unknown"},
            {"meetingPreferences": "123 Private Home Street"},
        ]:
            response = self.client.put(
                "/api/tutors/user/2/location", json=self.preferences(**changes)
            )
            self.assertEqual(response.status_code, 422, response.text)

    def test_online_preferences_need_no_area_and_clear_old_area(self):
        app.dependency_overrides[get_current_user] = lambda: self.owner
        response = self.client.put(
            "/api/tutors/user/2/location", json={"onlineEnabled": True, "inPersonEnabled": False}
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIsNone(response.json()["serviceArea"])

    def test_default_profile_is_online_only(self):
        user = User(
            id=5,
            auth_id="u5",
            email="5@example.test",
            first_name="Test",
            last_name="5",
            role=UserRole.TUTOR,
            timezone="UTC",
        )
        tutor = TutorProfile(id=5, user=user, intro="", bio="", price=0)
        self.db.add(tutor)
        self.db.commit()
        self.assertTrue(tutor.online_enabled)
        self.assertFalse(tutor.in_person_enabled)
        self.assertIsNone(tutor.service_area)

    def test_public_payload_contains_only_independent_area_point(self):
        data = self.search(mode="in-person", areaId="test-a", radius=10)["items"][0]
        self.assertEqual(data["serviceArea"]["source"], "synthetic test fixture")
        self.assertNotIn("placeId", data)
        self.assertNotIn("authId", data["user"])
        self.assertNotIn("address", data)
        self.assertEqual(data["availability"], [])  # Offering remains discoverable, no slot claim.

    def test_catalog_and_wildcards(self):
        self.assertEqual(
            len(self.client.get("/api/locations/areas", params={"q": "Synthetic"}).json()), 3
        )
        self.assertEqual(self.client.get("/api/locations/areas", params={"q": "%%"}).json(), [])
        self.assertEqual(self.client.get("/api/locations/areas/missing").status_code, 404)

    def test_online_tutor_registration_without_location(self):
        app.dependency_overrides[get_identity] = lambda: {
            "sub": "new-auth",
            "name": "New Tutor",
            "email": "new@example.test",
            "emailVerified": True,
        }
        self.addCleanup(patch.stopall)
        patch.object(settings, "legal_operator_name", "Test Operator").start()
        patch.object(settings, "legal_contact_email", "privacy@example.test").start()
        patch.object(settings, "legal_effective_date", "2026-11-05").start()
        patch.object(settings, "legal_publication_approved", True).start()
        response = self.client.post(
            "/api/users/",
            json={
                "authId": "new-auth",
                "email": "new@example.test",
                "firstName": "New",
                "lastName": "Tutor",
                "role": "tutor",
                "timezone": "UTC",
                "adultConfirmed": True,
                "termsAccepted": True,
                "termsVersion": TERMS_VERSION,
                "accountPurpose": "tutor",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        tutor = self.db.scalar(select(TutorProfile).where(TutorProfile.user_id == 100))
        self.assertTrue(tutor.online_enabled)
        self.assertFalse(tutor.in_person_enabled)
        self.assertIsNone(tutor.service_area_id)

    def test_existing_availability_round_trip(self):
        app.dependency_overrides[get_current_user] = lambda: self.owner
        # Give SQLite test fixture availability an explicit ID, emulating a PostgreSQL sequence.
        from app.models.tutor_availability import TutorAvailability

        @event.listens_for(self.db, "before_flush")
        def availability_id(session, *_):
            for obj in session.new:
                if isinstance(obj, TutorAvailability) and obj.id is None:
                    obj.id = 100

        response = self.client.put(
            "/api/tutors/2/availability",
            json={
                "availability": [
                    {
                        "type": "weekly",
                        "dayOfTheWeek": 1,
                        "startTime": 540,
                        "endTime": 600,
                        "timezone": "UTC",
                    }
                ]
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            self.client.get("/api/tutors/user/2").json()["availability"][0]["startTime"], 540
        )

    def test_subject_owner_update_and_unknown_subject(self):
        app.dependency_overrides[get_current_user] = lambda: self.owner
        self.db.add(Subject(id=1, name="Math", category=SubjectCategory.MATH))
        self.db.commit()
        response = self.client.patch("/api/tutors/user/2", json={"subjectIds": [1]})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["subjects"][0]["name"], "Math")
        self.assertEqual(
            self.client.patch("/api/tutors/user/2", json={"subjectIds": [999]}).status_code, 422
        )

    def test_google_selection_resolves_city_in_correct_region(self):
        self.area.name, self.area.region = "Example City", "AA"
        self.near.name, self.near.region = "Example City", "BB"
        self.db.commit()
        before = self.db.scalar(select(func.count()).select_from(ServiceArea))
        response = self.client.post(
            "/api/locations/resolve", json={"city": "Example City", "region": "BB", "country": "US"}
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["id"], "test-b")
        self.assertEqual(self.db.scalar(select(func.count()).select_from(ServiceArea)), before)
        # The resolved ID drives existing matching without changing the search contract.
        self.assertEqual(
            self.search(mode="in-person", areaId=response.json()["id"], radius=0)["total"], 2
        )

    def test_google_selection_resolves_zip(self):
        self.area.postal_code = "12345"
        self.db.commit()
        response = self.client.post(
            "/api/locations/resolve", json={"postalCode": "12345", "country": "US"}
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["id"], "test-a")

    def test_google_selection_does_not_guess_prefix_or_duplicate_area(self):
        self.area.name, self.area.region = "Example City", "AA"
        self.near.name, self.near.region = "Example City", "AA"
        self.db.commit()
        self.assertEqual(
            self.client.post(
                "/api/locations/resolve", json={"city": "Example", "region": "AA", "country": "US"}
            ).status_code,
            422,
        )
        self.assertEqual(
            self.client.post(
                "/api/locations/resolve",
                json={"city": "Example City", "region": "AA", "country": "US"},
            ).status_code,
            409,
        )
        self.area.postal_code = self.near.postal_code = "12345"
        self.db.commit()
        self.assertEqual(
            self.client.post(
                "/api/locations/resolve", json={"postalCode": "12345", "country": "US"}
            ).status_code,
            409,
        )

    def test_google_selection_rejects_invalid_or_unmapped_locations(self):
        for payload in [
            {},
            {"country": "CA", "postalCode": "12345"},
            {"country": "US", "city": "Example"},
            {"country": "US", "region": "AA", "city": "   "},
            {"country": "US", "postalCode": "1234"},
            {"country": "US", "postalCode": "99999"},
        ]:
            response = self.client.post("/api/locations/resolve", json=payload)
            self.assertEqual(response.status_code, 422, response.text)

    def test_importer_reads_tab_and_pipe_without_google_data(self):
        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "fixture.txt"
            for delimiter in ["\t", "|"]:
                path.write_text(
                    delimiter.join(["GEOID", "NAME", "USPS", "INTPTLAT", "INTPTLONG"])
                    + "\n"
                    + delimiter.join(["00000", "Synthetic Test", "TS", "0", "0"])
                    + "\n"
                )
                area = list(read_areas(path, "place", 2025))[0]
                self.assertEqual(area.id, "census-2025-place-00000")
                self.assertEqual(area.source, "US Census Gazetteer 2025")


if __name__ == "__main__":
    unittest.main()
