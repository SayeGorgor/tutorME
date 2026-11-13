import unittest
from sqlalchemy import select
import test_marketplace as marketplace
from app.actions.actions import get_identity
from app.main import app
from app.models.user import User
from app.services.policies import TERMS_VERSION


class RegistrationNameTests(unittest.TestCase):
    setUp = marketplace.MarketplaceTests.setUp
    tearDown = marketplace.MarketplaceTests.tearDown
    actor = marketplace.MarketplaceTests.actor

    def identity(self, name="Mary Ann O'Neill"):
        identity = {
            "sub": "new-named-person",
            "email": "registered-name@example.test",
            "emailVerified": True,
        }
        if name is not None:
            identity["name"] = name
        app.dependency_overrides[get_identity] = lambda: identity

    def payload(self, **changes):
        return dict(
            firstName="Mary Ann",
            lastName="O'Neill",
            role="tutor",
            accountPurpose="tutor",
            timezone="UTC",
            adultConfirmed=True,
            termsAccepted=True,
            termsVersion=TERMS_VERSION,
            **changes,
        )

    def test_status_exposes_registered_name_not_editable_client_input(self):
        self.identity()
        response = self.client.get("/api/users/registration-status")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["name"], "Mary Ann O'Neill")
        self.assertNotIn("sub", response.json())

    def test_completion_preserves_original_split_and_account_type(self):
        self.identity()
        response = self.client.post("/api/users/complete-registration", json=self.payload())
        self.assertEqual(response.status_code, 200, response.text)
        row = self.db.scalar(select(User).where(User.auth_id == "new-named-person"))
        self.assertEqual(
            (row.first_name, row.last_name, row.role.value), ("Mary Ann", "O'Neill", "tutor")
        )
        self.assertIsNotNone(row.tutor_profile)
        self.assertEqual(row.tutor_profile.price, 20.0)

    def test_changed_name_rejected_without_creating_account(self):
        self.identity()
        payload = self.payload()
        payload["firstName"] = "Different"
        response = self.client.post("/api/users/complete-registration", json=payload)
        self.assertEqual(response.status_code, 409, response.text)
        self.assertEqual(response.json()["detail"]["code"], "REGISTERED_NAME_MISMATCH")
        self.assertIsNone(self.db.scalar(select(User).where(User.auth_id == "new-named-person")))

    def test_missing_provider_name_fails_closed_and_can_retry(self):
        self.identity(None)
        response = self.client.post("/api/users/complete-registration", json=self.payload())
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["detail"]["code"], "PROVIDER_NAME_UNAVAILABLE")
        self.identity()
        self.assertEqual(
            self.client.post("/api/users/complete-registration", json=self.payload()).status_code,
            200,
        )

    def test_single_name_identity_does_not_require_invented_surname(self):
        self.identity("SingleName")
        payload = self.payload()
        payload.update(firstName="SingleName", lastName="")
        response = self.client.post("/api/users/complete-registration", json=payload)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["lastName"], "")
