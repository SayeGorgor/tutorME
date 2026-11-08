# Authentication hardening review — November 8, 2026

Local implementation and verification only. No credentials, provider settings, hosted databases, migrations, deployments, pushes or Git history were changed. The initial working tree was clean. Environment files were preserved and their values are excluded from this report.

## Findings and verified contract

The audit's `actions/actions.py` is `backend/app/actions/actions.py`. Installed Python packages match the pins: PyJWT 2.14.0, FastAPI 0.141.1, cryptography 50.0.1. Frontend uses @neondatabase/auth 0.5.0-beta and Better Auth overrides 1.6.23. Inspected the installed SDK token/proxy implementations, Better Auth JWT signer, and installed PyJWT decoding/JWKS code in addition to the authoritative references below. The hosted service's internal package version cannot be established from client dependencies.

The frontend obtains the provider JWT with `authClient.token()` or its same-origin `/api/auth/token` proxy and attaches it as a bearer token. Missing/opaque token values are blocked by the frontend and backend. The backend accepts the configured Managed Better Auth signing keys, EdDSA, and the configured Auth URL origin as both issuer and audience. It does not support Google ID/access tokens, legacy Stack Auth tokens, anonymous tokens without a subject, or opaque session cookies as backend credentials. Google login exchanges through Neon; Google is not the API token issuer. No alternative verifier was found.

[Neon JWT documentation](https://neon.com/docs/auth/guides/plugins/jwt) distinguishes browser sessions from external-service JWTs and shows `sub`, `exp`, `iat`, issuer and audience in its example. [Neon Functions documentation](https://neon.com/docs/compute/functions/authentication) confirms EdDSA and 15-minute JWTs and illustrates `authClient.token()`. The installed Better Auth signer always sets expiration (default 15 minutes), issuer and audience, and derives subject from the authenticated user. These establish compatibility for requiring expiration on this JWT path; they do not establish identical claims for every Neon token. Current docs also describe a session-token retrieval path; this patch preserves the installed SDK's existing token flow.

Confirmed weakness: a correctly signed JWT without `exp` previously passed verification indefinitely. This is a validation gap, not evidence that the provider issued such a token or that an attacker can sign one. Signature, EdDSA restriction, issuer/audience checks, nonempty subject checks and ownership guards already existed. Missing issuer/audience already failed through PyJWT; listing them as required makes the contract explicit. Malformed claim types or malformed JWKS JSON/key data could raise errors outside the previous handlers. These now reject with a generic 401.

The verifier now requires `exp`, `iss`, `aud`, `sub`; validates signature, fixed EdDSA, origin issuer/audience, expiration and nonblank string subject; and validates `iat` and `nbf` when present. It retains ten seconds of skew for clock drift. Neither optional timestamp is newly required: `nbf` is not guaranteed, and no new dependency on issued-at presence is necessary. Audience arrays remain supported by PyJWT. NumericDate interpretation remains PyJWT's behavior. No client-supplied role claim grants application privileges.

[PyJWT 2.14.0 API](https://pyjwt.readthedocs.io/en/2.14.0/api.html) documents explicit required claims and the fixed algorithm allowlist requirement. Installed implementation confirms optional timestamp validation, cache behavior and error types. JWKS uses the configured URL only, a five-second fetch timeout (previous default 30), five-minute set cache, no indefinite per-key cache, and the library's 30-second unknown-key refresh cooldown. A fresh cached known key can authenticate during an outage; an expired/absent cache cannot. Unknown keys refresh after cooldown, which can briefly reject a newly rotated key. No signature bypass or stale-cache fallback was introduced.

## Authorization review

Reviewed all route modules and registration/booking services. User lookup binds signed subject to the database's application user. `/users/me`, eligibility and deletion act on that user. Registration derives signed email/name, requires boolean verification and rejects supplied identity/email mismatches; retries preserve existing role/purpose. Choosing a role at initial onboarding remains the intended product behavior.

Tutor profile/location/availability writes require both tutor role and matching owner. Custom subjects require tutor role. Booking creation requires an eligible self-managed student; participant queries scope reads; status changes check participants and tutor/student action permissions; meeting details require the booked tutor and confirmed status. Cross-account mutations reject. Public tutor/search/slot endpoints intentionally remain public and use constrained response payloads. No ownership guards were changed and no authorization bypass was identified in these reviewed paths. This is not a claim of a complete penetration test.

## Exact modified files

- `backend/app/actions/actions.py`: required claims, early fixed-algorithm rejection, bounded JWKS timeout and safe validation error handling.
- `backend/tests/test_auth_token_validation.py`: six additional tests (nine total) covering required/malformed claims, optional future timestamps, unsupported algorithms before network lookup, outage/JSON/key failures, bounded skew, a real dependency HTTP request, and library JWKS caching/rotation/outage behavior. Existing tests cover invalid signature, issuer, audience, expiry and subject.
- `docs/authentication-and-authorization.md`: updated verification boundary.
- `docs/auth-hardening-2026-11-08.md`: this report.

## Local verification

- Backend full suite before the final cache test: 133 tests, 130 passed and three disposable PostgreSQL tests skipped. Synthetic process settings and SQLite only; live-test opt-in removed.
- Final authentication suite: nine tests passed, including the subsequently added real JWKS-client cache/rotation test. Keys and tokens are generated locally; HTTP is mocked.
- Frontend Node suite: 51 passed, including auth retry, token forwarding, verification/signup, registration receipt and role navigation tests.
- TypeScript `npx.cmd tsc --noEmit`: passed.
- ESLint: zero errors, four existing unused-variable warnings in tutor profile page.
- Production build: failed fetching Geist, Geist Mono and Inter from Google Fonts due to network connectivity. Build completion is not verified. No unrelated font changes were made.
- Existing backend regression tests exercise valid/invalid student/tutor actions, cross-user bookings, owner availability/profile writes, guest rejection and registration continuity. Most override identity/current-user dependencies, so they test authorization separately from cryptographic validation. The new isolated HTTP test uses the real identity dependency.

PowerShell blocked npm/npx script wrappers; `.cmd` executables ran successfully without changing execution policy. Test output also contains existing Node module-type and Starlette/httpx deprecation warnings.

## Remaining risks and controlled acceptance

JWT verification is offline: logout, password reset, session expiry or provider revocation does not immediately invalidate a previously issued JWT. It can remain usable until expiration plus ten seconds (normally about 15 minutes). Expired JWTs reject; immediate session revocation would require a separately verified provider introspection/revocation design. Application roles are read from the database, not stale JWT role claims. Outages fail closed with 401, which clients can interpret as a sign-in failure. Rate limiting and dependency advisory review remain separate work; no dependencies were upgraded here. Synthetic tests cannot prove hosted claim configuration.

Before rollout, use approved staging accounts and a disposable staging database, with no production tokens in logs:

1. Sign up with email/password, follow verification email, finish student setup; repeat for tutor. Retry interrupted onboarding and confirm the same account/role and original names persist. Test verification-required rejection, password reset and sign-in after recovery.
2. Sign in with Google through Neon and finish or resume onboarding. Confirm JWT endpoint returns the documented required claims and EdDSA locally without copying token values into reports. Verify configured issuer/audience origin and JWKS endpoint against staging configuration.
3. Reload and reopen the browser, exercise protected student/tutor dashboards, let the JWT expire and verify normal SDK refresh. Sign out and confirm browser navigation/API requests no longer obtain credentials; document the outstanding already-issued JWT window separately.
4. Create/read/cancel a student booking; accept/decline/complete and edit availability as tutor. Repeat requests from another student/tutor and a guest, expecting denial. Confirm public profiles omit private meeting information.
5. Rehearse signing-key rotation and JWKS outage/recovery on staging; confirm bounded failures and recovery after cooldown/cache expiry. Rerun the build with approved font access and complete hosted browser checks.

Roll out only after those checks, monitor redacted 401 rates, JWKS latency/failures and onboarding errors, and canary before wider release. Keep the prior application artifact for rollback; reverting this patch needs no schema or configuration changes but restores the missing-expiration weakness. Prefer pausing rollout and investigating provider incompatibility over removing signature/issuer/audience checks or adding a permissive fallback. No production release is authorized or performed by this task.
