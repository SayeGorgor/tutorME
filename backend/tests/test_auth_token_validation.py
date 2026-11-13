"""Generated local keys and mocked JWKS only; no provider or database calls."""

import unittest
from datetime import datetime, timedelta, timezone
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
        self.key = Ed25519PrivateKey.generate()
        self.payload = dict(
            sub="synthetic-user",
            iss=actions.NEON_AUTH_ISSUER_AUDIENCE,
            aud=actions.NEON_AUTH_ISSUER_AUDIENCE,
            exp=datetime.now(timezone.utc) + timedelta(minutes=1),
        )

    def identity(self, token):
        return actions.get_identity(
            HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        )

    def test_malformed_token_rejected_before_jwks_lookup(self):
        with patch.object(actions.jwks_client, "get_signing_key_from_jwt") as lookup:
            for token in ("undefined", "null", "opaque-session-token", "a.b", "a..c"):
                with self.assertRaises(HTTPException) as error:
                    self.identity(token)
                self.assertEqual(error.exception.status_code, 401)
            lookup.assert_not_called()

    def test_valid_signed_identity_accepted(self):
        with patch.object(
            actions.jwks_client,
            "get_signing_key_from_jwt",
            return_value=SimpleNamespace(key=self.key.public_key()),
        ):
            self.assertEqual(
                self.identity(jwt.encode(self.payload, self.key, algorithm="EdDSA"))["sub"],
                "synthetic-user",
            )

    def test_signature_issuer_audience_expiry_and_subject_still_enforced(self):
        cases = [
            ({**self.payload, "iss": "https://wrong.example"}, self.key),
            ({**self.payload, "aud": "wrong"}, self.key),
            ({**self.payload, "exp": datetime.now(timezone.utc) - timedelta(minutes=2)}, self.key),
            ({**self.payload, "sub": ""}, self.key),
            (self.payload, Ed25519PrivateKey.generate()),
        ]
        with patch.object(
            actions.jwks_client,
            "get_signing_key_from_jwt",
            return_value=SimpleNamespace(key=self.key.public_key()),
        ):
            for payload, key in cases:
                with self.assertRaises(HTTPException) as error:
                    self.identity(jwt.encode(payload, key, algorithm="EdDSA"))
                self.assertEqual(error.exception.status_code, 401)

    def test_required_claims_and_malformed_optional_dates(self):
        cases = []
        for claim in ("exp", "iss", "aud", "sub"):
            cases.append({k: v for k, v in self.payload.items() if k != claim})
        for claim, values in {
            "sub": [None, 12, [], "   "],
            "exp": [None, [], {}, "invalid"],
            "iat": [None, [], "invalid", datetime.now(timezone.utc) + timedelta(minutes=2)],
            "nbf": [None, [], "invalid", datetime.now(timezone.utc) + timedelta(minutes=2)],
        }.items():
            cases.extend({**self.payload, claim: value} for value in values)
        with patch.object(
            actions.jwks_client,
            "get_signing_key_from_jwt",
            return_value=SimpleNamespace(key=self.key.public_key()),
        ):
            for payload in cases:
                with self.subTest(payload=payload):
                    with self.assertRaises(HTTPException) as error:
                        self.identity(jwt.encode(payload, self.key, algorithm="EdDSA"))
                    self.assertEqual(error.exception.status_code, 401)

    def test_unsupported_algorithm_rejected_before_key_lookup(self):
        with patch.object(actions.jwks_client, "get_signing_key_from_jwt") as lookup:
            with self.assertRaises(HTTPException) as error:
                self.identity(
                    jwt.encode(
                        self.payload, "synthetic-secret-of-at-least-32-bytes", algorithm="HS256"
                    )
                )
            self.assertEqual(error.exception.status_code, 401)
            lookup.assert_not_called()

    def test_jwks_failures_reject_without_exposing_provider_details(self):
        token = jwt.encode(self.payload, self.key, algorithm="EdDSA")
        for failure in (
            jwt.PyJWKClientConnectionError("private upstream details"),
            jwt.PyJWKClientError("unknown kid"),
            ValueError("invalid JSON"),
            jwt.PyJWKError("invalid key"),
        ):
            with self.subTest(failure=type(failure).__name__):
                with patch.object(
                    actions.jwks_client, "get_signing_key_from_jwt", side_effect=failure
                ):
                    with self.assertRaises(HTTPException) as error:
                        self.identity(token)
                    self.assertEqual(error.exception.status_code, 401)
                    self.assertEqual(error.exception.detail, "Invalid token")

    def test_clock_skew_is_bounded(self):
        with patch.object(
            actions.jwks_client,
            "get_signing_key_from_jwt",
            return_value=SimpleNamespace(key=self.key.public_key()),
        ):
            payload = {**self.payload, "nbf": datetime.now(timezone.utc) + timedelta(seconds=5)}
            self.assertEqual(
                self.identity(jwt.encode(payload, self.key, algorithm="EdDSA"))["sub"],
                "synthetic-user",
            )

    def test_real_jwks_cache_rotation_and_expired_cache_outage(self):
        import io
        import json
        from urllib.error import URLError

        client = jwt.PyJWKClient("https://auth.example.test/jwks", timeout=5)
        second = Ed25519PrivateKey.generate()

        def jwk(key, kid):
            return {
                **json.loads(jwt.algorithms.OKPAlgorithm.to_jwk(key.public_key())),
                "kid": kid,
                "use": "sig",
            }

        keys = [jwk(self.key, "first")]

        def response(*args, **kwargs):
            self.assertEqual(kwargs["timeout"], 5)
            return io.BytesIO(json.dumps({"keys": keys}).encode())

        first_token = jwt.encode(
            self.payload, self.key, algorithm="EdDSA", headers={"kid": "first"}
        )
        second_token = jwt.encode(
            self.payload, second, algorithm="EdDSA", headers={"kid": "second"}
        )
        with (
            patch.object(actions, "jwks_client", client),
            patch("jwt.jwks_client.urllib.request.build_opener") as opener,
        ):
            opener.return_value.open.side_effect = response
            self.identity(first_token)
            self.identity(first_token)
            self.assertEqual(opener.return_value.open.call_count, 1)
            keys.append(jwk(second, "second"))
            # Once the documented cooldown ends, unknown kids refresh the set.
            client._last_successful_fetch -= 31
            self.identity(second_token)
            self.assertEqual(opener.return_value.open.call_count, 2)
            client.jwk_set_cache.put(None)
            opener.return_value.open.side_effect = URLError("synthetic outage")
            with self.assertRaises(HTTPException) as error:
                self.identity(first_token)
            self.assertEqual(error.exception.status_code, 401)

    def test_protected_route_uses_real_identity_dependency(self):
        from fastapi import Depends, FastAPI
        from fastapi.testclient import TestClient

        app = FastAPI()

        @app.get("/protected")
        def protected(identity=Depends(actions.get_identity)):
            return {"sub": identity["sub"]}

        with TestClient(app) as client:
            self.assertEqual(client.get("/protected").status_code, 401)
            with patch.object(
                actions.jwks_client,
                "get_signing_key_from_jwt",
                return_value=SimpleNamespace(key=self.key.public_key()),
            ):
                for payload, status in ((self.payload, 200), ({**self.payload, "exp": 1}, 401)):
                    response = client.get(
                        "/protected",
                        headers={
                            "Authorization": "Bearer "
                            + jwt.encode(payload, self.key, algorithm="EdDSA")
                        },
                    )
                    self.assertEqual(response.status_code, status)
