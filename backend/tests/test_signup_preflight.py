"""Synthetic application/provider fixtures only; never connects to Neon."""
import unittest
from unittest.mock import patch
from sqlalchemy import text
import test_marketplace as marketplace
from app.services.policies import TERMS_VERSION
from app.core.config import settings

class SignupPreflightTests(unittest.TestCase):
    setUp=marketplace.MarketplaceTests.setUp
    tearDown=marketplace.MarketplaceTests.tearDown
    actor=marketplace.MarketplaceTests.actor

    def request(self,email,**changes):
        return self.client.post("/api/policies/registration-check",json=dict(email=email,adultConfirmed=True,termsAccepted=True,termsVersion=TERMS_VERSION,accountPurpose="self",**changes))

    def auth_fixture(self,email):
        self.db.execute(text("ATTACH DATABASE ':memory:' AS neon_auth"))
        self.db.execute(text('CREATE TABLE neon_auth."user" (email TEXT)'))
        if email:self.db.execute(text('INSERT INTO neon_auth."user" (email) VALUES (:email)'),{"email":email})
        self.db.commit()

    def test_existing_app_email_rejected_case_insensitively(self):
        response=self.request(" ADULT@EXAMPLE.TEST ")
        self.assertEqual(response.status_code,409,response.text)
        self.assertEqual(response.json()["detail"]["code"],"ACCOUNT_ALREADY_EXISTS")
        self.assertNotIn("auth_id",response.text)

    def test_auth_only_identity_rejected_without_app_user(self):
        self.auth_fixture("ProviderOnly@example.test")
        self.assertEqual(self.request("provideronly@example.test").status_code,409)

    def test_new_email_passes_without_creating_identity(self):
        self.auth_fixture("existing@example.test")
        response=self.request("new@example.test")
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(self.db.scalar(text('SELECT count(*) FROM neon_auth."user"')),1)

    def test_provider_directory_unavailable_fails_closed(self):
        self.assertEqual(self.request("new@example.test").status_code,503)

    def test_invalid_email_and_policy_fields_rejected_before_provider_lookup(self):
        self.assertEqual(self.request("not-an-email").status_code,422)
        payload=dict(email="new@example.test",adultConfirmed=False,termsAccepted=True,termsVersion=TERMS_VERSION,accountPurpose="self")
        self.assertEqual(self.client.post("/api/policies/registration-check",json=payload).status_code,422)
        with patch.object(settings,"legal_publication_approved",False):
            self.assertEqual(self.request("new@example.test").status_code,503)
