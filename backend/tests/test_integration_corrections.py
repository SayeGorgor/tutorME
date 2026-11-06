"""Regression checks use SQLite fixtures and mocked target verification only."""
import unittest
from unittest.mock import Mock, patch
import test_locations as fixtures
import test_marketplace as marketplace
from app.main import app
from app.actions.actions import get_identity
from app.models.user import User
from app.models.booking import DeletionRequest
from app.services.policies import TERMS_VERSION
from app.services.registration import verified_identity_email
from fastapi import HTTPException
from sqlalchemy import select, func, delete
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from app.models.service_area import ServiceArea
from app.schemas.user import UserCompletion
from app.services.registration import complete_registration
from postgres_test_guard import approved_target, verify_connection, PROTECTED_BRANCH

class CorrectionsTests(unittest.TestCase):
    setUp = marketplace.MarketplaceTests.setUp
    tearDown = marketplace.MarketplaceTests.tearDown
    actor = marketplace.MarketplaceTests.actor
    create_booking = marketplace.MarketplaceTests.create_booking
    def test_completion_retry_and_verified_email(self):
        identity={"sub":"completion-user","name":"First Last","email":"verified@example.test","emailVerified":True}
        app.dependency_overrides[get_identity]=lambda:identity
        payload=dict(firstName="First",lastName="Last",role="student",timezone="UTC",adultConfirmed=True,termsAccepted=True,termsVersion=TERMS_VERSION,accountPurpose="self")
        path="/api/users/complete-registration"
        self.assertEqual(self.client.get("/api/users/registration-status").json()["status"],"needs_completion")
        first=self.client.post(path,json=payload)
        self.assertEqual(first.status_code,200,first.text)
        second=self.client.post(path,json={**payload,"firstName":"Changed"})
        self.assertEqual(second.status_code,200,second.text)
        self.assertEqual(first.json(),second.json())
        self.assertEqual(self.db.scalar(select(func.count()).select_from(User).where(User.auth_id==identity["sub"])),1)
        self.assertEqual(self.client.post(path,json={**payload,"role":"tutor","accountPurpose":"tutor"}).status_code,409)
        self.assertEqual(self.client.get("/api/users/registration-status").json()["status"],"complete")

    def test_unverified_completion_does_not_create_user(self):
        app.dependency_overrides[get_identity]=lambda:{"sub":"unverified","email":"a@example.test","emailVerified":False}
        payload=dict(firstName="First",lastName="Last",role="student",timezone="UTC",adultConfirmed=True,termsAccepted=True,termsVersion=TERMS_VERSION,accountPurpose="self")
        self.assertEqual(self.client.post("/api/users/complete-registration",json=payload).status_code,403)
        self.assertIsNone(self.db.scalar(select(User).where(User.auth_id=="unverified")))

    def test_pending_mode_change_conflicts_and_exact_retry_returns_same(self):
        tutor=self.db.get(marketplace.TutorProfile,1)
        tutor.in_person_enabled=True; tutor.service_area_id="test-a"; self.db.commit()
        first=self.create_booking().json()
        self.assertEqual(self.create_booking().json()["id"],first["id"])
        self.assertEqual(self.create_booking(mode="in-person").status_code,409)

    def test_deletion_lifecycle_preserves_closed_request(self):
        for state in ("pending","under_review","rejected","processed","completed","unknown"):
            row=self.db.scalar(select(DeletionRequest).where(DeletionRequest.user_id==self.student.id))
            if row is None:
                self.client.post("/api/users/me/deletion-request")
                row=self.db.scalar(select(DeletionRequest).where(DeletionRequest.user_id==self.student.id))
            row.status=state; self.db.commit()
            result=self.client.get("/api/users/me/deletion-request").json()
            self.assertEqual(result["blocksNewBookings"],state not in ("rejected","processed","completed"))
            if state in ("rejected","processed","completed"):
                self.assertEqual(self.client.post("/api/users/me/deletion-request").status_code,409)
                self.db.refresh(row); self.assertEqual(row.status,state)

    def test_failed_app_commit_can_retry_without_new_identity(self):
        identity={"sub":"retry-user","name":"First Last","email":"retry@example.test","emailVerified":True}
        app.dependency_overrides[get_identity]=lambda:identity
        payload=dict(firstName="First",lastName="Last",role="student",timezone="UTC",adultConfirmed=True,termsAccepted=True,termsVersion=TERMS_VERSION,accountPurpose="self")
        with patch.object(self.db,"commit",side_effect=SQLAlchemyError("synthetic failure")):
            self.assertEqual(self.client.post("/api/users/complete-registration",json=payload).status_code,503)
        self.assertIsNone(self.db.scalar(select(User).where(User.auth_id==identity["sub"])))
        self.assertEqual(self.client.post("/api/users/complete-registration",json=payload).status_code,200)

    def test_unique_race_only_returns_same_identity_winner(self):
        identity={"sub":self.student.auth_id,"name":"First Last","email":self.student.email,"emailVerified":True}
        data=UserCompletion(firstName="First",lastName="Last",role="student",timezone="UTC",adultConfirmed=True,termsAccepted=True,termsVersion=TERMS_VERSION,accountPurpose="self")
        db=Mock();db.scalar.side_effect=[None,self.student];db.commit.side_effect=IntegrityError("synthetic",{},Exception())
        self.assertIs(complete_registration(db,identity,data),self.student)
        db.rollback.assert_called_once()
        db=Mock();db.scalar.side_effect=[None,None];db.commit.side_effect=IntegrityError("synthetic",{},Exception())
        with self.assertRaises(HTTPException) as caught: complete_registration(db,identity,data)
        self.assertEqual(caught.exception.status_code,409)

    def test_closed_deletion_permits_booking_active_prevents_confirmation(self):
        self.client.post("/api/users/me/deletion-request")
        row=self.db.get(DeletionRequest,self.student.id)
        for state in ("rejected","processed","completed"):
            row.status=state;self.db.commit()
            self.assertEqual(self.create_booking().status_code,200)
        booking=self.create_booking().json()
        row.status="under_review";self.db.commit()
        self.actor(self.db.get(User,1))
        self.assertEqual(self.client.post(f"/api/bookings/{booking['id']}/status",json={"action":"confirm"}).status_code,409)

    def test_empty_catalog_gives_actionable_error(self):
        self.db.execute(delete(ServiceArea));self.db.commit()
        response=self.client.post("/api/locations/resolve",json={"country":"US","postalCode":"12345"})
        self.assertEqual(response.status_code,503)
        self.assertEqual(response.json()["detail"]["code"],"LOCATION_CATALOG_UNAVAILABLE")

class ClaimAndGuardTests(unittest.TestCase):
    def test_claims_fail_closed(self):
        for identity in ({}, {"email":"a@example.test"}, {"email":"a@example.test","emailVerified":"true"}, {"email":"a@example.test","emailVerified":False}, {"email":"a@example.test","emailVerified":True,"email_verified":False}):
            with self.assertRaises(HTTPException): verified_identity_email(identity)
        self.assertEqual(verified_identity_email({"email":"A@example.test","emailVerified":True}),"a@example.test")

    def environment(self):
        return dict(TUTORME_RUN_POSTGRES_TESTS="1",TUTORME_TEST_DATABASE_IS_DISPOSABLE="1",TUTORME_TEST_PROJECT_ID="test-project",TUTORME_TEST_BRANCH_ID="br-disposable",TUTORME_TEST_DATABASE_NAME="neondb",TUTORME_TEST_DATABASE_URL="postgresql+psycopg://fake:private@ep-disposable.example/neondb?sslmode=require")

    def test_guard_requires_all_approvals(self):
        environment=self.environment()
        for key in environment:
            changed={**environment}; changed.pop(key)
            with self.assertRaises(RuntimeError): approved_target(changed)
        with self.assertRaises(RuntimeError): approved_target({**environment,"TUTORME_TEST_BRANCH_ID":PROTECTED_BRANCH})
        self.assertNotIn("private",repr(approved_target(environment)))

    def test_actual_identity_readonly_and_rollback(self):
        target=approved_target(self.environment())
        for actual in (("test-project",PROTECTED_BRANCH,"neondb"),("wrong","br-disposable","neondb")):
            conn=Mock(); conn.scalar.return_value="on";conn.execute.return_value.one.return_value=actual
            with self.assertRaises(RuntimeError): verify_connection(conn,target)
            conn.exec_driver_sql.assert_called_once_with("SET TRANSACTION READ ONLY")
            conn.rollback.assert_called_once()
        conn=Mock();conn.scalar.return_value="on";conn.execute.return_value.one.return_value=(target.project,target.branch,target.database)
        verify_connection(conn,target);conn.rollback.assert_called_once()
