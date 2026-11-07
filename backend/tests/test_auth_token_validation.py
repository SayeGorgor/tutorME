"""Generated local keys and mocked JWKS only; no provider or database calls."""
import unittest
from datetime import datetime,timedelta,timezone
from types import SimpleNamespace
from unittest.mock import patch
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
import jwt
import test_locations  # Synthetic settings before application imports.
from app.actions import actions

class TokenValidationTests(unittest.TestCase):
    def setUp(self):
        self.key=Ed25519PrivateKey.generate()
        self.payload=dict(sub="synthetic-user",iss=actions.NEON_AUTH_ISSUER_AUDIENCE,aud=actions.NEON_AUTH_ISSUER_AUDIENCE,exp=datetime.now(timezone.utc)+timedelta(minutes=1))

    def identity(self,token):
        return actions.get_identity(HTTPAuthorizationCredentials(scheme="Bearer",credentials=token))

    def test_malformed_token_rejected_before_jwks_lookup(self):
        with patch.object(actions.jwks_client,"get_signing_key_from_jwt") as lookup:
            for token in ("undefined","null","opaque-session-token","a.b","a..c"):
                with self.assertRaises(HTTPException) as error:self.identity(token)
                self.assertEqual(error.exception.status_code,401)
            lookup.assert_not_called()

    def test_valid_signed_identity_accepted(self):
        with patch.object(actions.jwks_client,"get_signing_key_from_jwt",return_value=SimpleNamespace(key=self.key.public_key())):
            self.assertEqual(self.identity(jwt.encode(self.payload,self.key,algorithm="EdDSA"))["sub"],"synthetic-user")

    def test_signature_issuer_audience_expiry_and_subject_still_enforced(self):
        cases=[({**self.payload,"iss":"https://wrong.example"},self.key),({**self.payload,"aud":"wrong"},self.key),({**self.payload,"exp":datetime.now(timezone.utc)-timedelta(minutes=2)},self.key),({**self.payload,"sub":""},self.key),(self.payload,Ed25519PrivateKey.generate())]
        with patch.object(actions.jwks_client,"get_signing_key_from_jwt",return_value=SimpleNamespace(key=self.key.public_key())):
            for payload,key in cases:
                with self.assertRaises(HTTPException) as error:self.identity(jwt.encode(payload,key,algorithm="EdDSA"))
                self.assertEqual(error.exception.status_code,401)
