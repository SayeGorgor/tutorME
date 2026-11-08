# Authentication and authorization

Neon Auth manages sign-in identity, verification and sessions. The Next.js [auth proxy](../frontend/app/api/auth/%5B...path%5D/route.ts) integrates provider handlers; backend [identity dependencies](../backend/app/actions/actions.py) validate JWTs and resolve application users. API authorization remains authoritative even if navigation admits the wrong role.

## Identity and registration

Verification fixes EdDSA, validates configured issuer/audience and rejects empty subjects. [Registration](../backend/app/services/registration.py) derives email/name from signed identity and requires strictly boolean true email verification, rejecting absent/conflicting/string flags. Legacy client identity/email mismatches reject. Explicit current adult/Terms acknowledgments record actual completion time; a provider account alone is not consent.

Hosted signup and application creation are separate operations. Auth-only users can sign in and finish setup without another signup. Retry returns only the matching authenticated record and preserves existing role/name/email/acknowledgments. Database failures do not delete provider identities; the legacy creation endpoint shares the completion service.

The [encrypted signup receipt](../frontend/lib/auth/registration-draft.ts) retains choices for seven days in HttpOnly, SameSite=Lax cookies (Secure on HTTPS). Purpose-derived encryption uses the existing server secret. Authenticated context lookup binds subject/email/name/expiry and excludes passwords/provider tokens. Completion clears it; another browser or missing receipt uses verified-name recovery.

## Preflight and provider boundary

[Signup preflight](../backend/app/services/signup_check.py) performs parameterized boolean application/provider-directory reads. Proxy duplicates conflict before hosted signup; unavailable checks fail closed. Email existence is intentionally reflected in the response, with no identity details. This check is not atomic with hosted signup and cannot universally eliminate simultaneous first-signup mail.

Application controls do not establish provider-wide signup policy. Hosted verification delivery, claims, trusted origins and directory privacy/eligibility require deployment acceptance. CORS and email verification do not replace adult/Terms acknowledgment or backend authorization.

## Resource ownership and lifecycle

Tutor profile/location/availability edits require the current tutor owner. Eligible self-managed students create requests; tutors accept/decline/complete; both participants can cancel/read their records. Public tutor payloads exclude private meeting data. Guardian/demo restrictions do not imply support for genuine minor bookings.

[Deletion status](../backend/app/services/deletion.py) blocks new booking activity for active/unknown states. Closed rejected/processed/completed rows do not permanently block by themselves. Requests preserve prior records and require operator handling; submission does not delete an account/history.

## Validation boundary

Expiration is required and verified, along with issuer, audience and a nonempty string subject. EdDSA is fixed; optional issued-at/not-before claims are validated with ten seconds of clock skew. JWKS fetches have a five-second timeout and a bounded cache, with failures rejecting authentication. See the [November 8 hardening report](auth-hardening-2026-11-08.md) for evidence, limitations and rollout checks. This guide does not assert production configuration or successful live testing. Provider acceptance can create sessions/send mail; use approved controlled accounts. See [deployment](deployment.md) and [testing](testing.md).
