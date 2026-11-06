# Registration continuity through email verification

November 6, 2026

The normal flow is now signup → email verification → login → automatic TutorME setup → the selected student/tutor dashboard. The completion page no longer presents editable names or a replacement account-type selector when the original choices are available.

## Retained details

Successful signup saves an encrypted, HttpOnly, SameSite=Lax cookie for seven days in that browser. HTTPS responses also set Secure. The payload contains the original first/last-name split, student/tutor choice, self/guardian/tutor purpose, time zone, current Terms version and explicit adult/Terms acknowledgments. It is bound to the provider's returned subject and email. Passwords and provider tokens are excluded. The encryption key is purpose-derived from the existing server `NEON_AUTH_COOKIE_SECRET`; no new secret or env change is required.

The proxy saves this receipt only after eligibility preflight and successful provider signup. Existing provider response/session cookies are preserved. Failed/duplicate signup does not save a receipt. A receipt-writing failure leaves the provider success intact so users can use verified-name recovery instead of receiving a misleading duplicate-prone signup error. The selected type travels as application `accountType`, not the provider's reserved `role` field; it does not set Neon administrator/provider roles.

GET `/api/registration/context` requires a signed-in Neon session. It decrypts and validates the cookie and releases only a matching identity's saved details. A different subject, email, registered name, invalid ciphertext, expired receipt or changed cookie secret cannot supply another user's details. The payload is not placed in URLs or browser-readable storage. Completion clears the draft after success; otherwise it remains available for retry until expiry.

## Name authority and minimal completion

The backend registration-status response now supplies the name from the existing verified JWT alongside verified email. New application-user creation validates that the submitted first/last names reproduce that signed registered name. Both completion endpoints use this check. A changed name returns `REGISTERED_NAME_MISMATCH`; a missing signed name returns `PROVIDER_NAME_UNAVAILABLE` and asks for fresh sign-in/support rather than trusting new client text. Existing-user retries still return the existing record without rewriting its names or timestamps.

The completion UI displays the registered name and verified email read-only. With a matching current receipt, it reuses the exact original name split, type, purpose, timezone and acknowledgments and automatically submits the authenticated completion request. The existing backend still requires verified email, published/current policies, allowed role/purpose and strict true acknowledgments. Booking eligibility and authentication token validation were not relaxed. A current receipt avoids asking for the same consent again; new Terms require explicit renewed acceptance. Application acknowledgment timestamps remain server-generated when completion is recorded, not fabricated from an earlier browser timestamp.

Missing or expired receipts, older signups and signups continued in another browser cannot recover an account type that was never stored server-side. In that fallback, the page keeps the registered full name and asks only for missing account choices and current acknowledgments. It does not silently default to student. If the original name split is unavailable, the verified full name is split at the first word boundary; the complete displayed name is preserved. Single-name identities use an empty surname instead of an invented one. No provider name is edited automatically.

This is browser-bound continuity, not a cross-device pending-registration database. Persisting the original choices across devices or beyond seven days would require a separately designed durable signup-intent store. A transient context-load failure offers retry rather than treating the original choice as missing. Completion creation remains idempotent; failed writes retain the receipt and expose retry. No account is deleted to compensate for a failure.

## Files changed

- `frontend/components/SignupForm.tsx`: include allowlisted original details with the signup request.
- `frontend/lib/auth/signup-handler.ts`, `frontend/app/api/auth/[...path]/route.ts`: successful-signup receipt hook.
- `frontend/lib/auth/registration-draft.ts`: encrypted receipt, validation, expiry and identity binding.
- `frontend/app/api/registration/context/route.ts`: authenticated context and browser-cookie cleanup.
- `frontend/lib/auth/completion-plan.ts`, `frontend/components/CompleteRegistration.tsx`: original-details reuse, automatic completion and minimal fallback.
- `frontend/lib/types.ts`: registered name/status types.
- `backend/app/services/registration.py`, `backend/app/routes/users.py`, `backend/app/schemas/user.py`: signed-name authority, response and single-name support.
- Existing registration test fixtures now include signed names; new tests in `backend/tests/test_registration_names.py` and `frontend/tests/registration-context.mjs`.

## Validation and rollout

Isolated backend suite: **88 passed, 1 live PostgreSQL test skipped** (89 total). Frontend Node suite: **29 passed**. Tests cover original name/type/purpose retention, cookie encryption/tampering/expiry/ownership, stale Terms, missing receipts, failed/duplicate signup, preservation of provider cookies, name mismatch rejection, missing signed names and single-name fallback. Focused ESLint, TypeScript and production build pass.

These tests use mocked provider responses and synthetic SQLite fixtures. No real signup, provider email, configured database write, migration, seed, existing-account update, feature-flag change or Auth configuration change was performed. Installed SDK handling of provider signup fields was inspected; hosted end-to-end verification remains a controlled manual acceptance step.

Restart frontend and backend together. Existing incomplete signups cannot acquire a historical receipt retroactively, so they use the minimal fallback once. New signups in the same browser should retain the original type and proceed directly to their dashboard after verification and login. Missing signed JWT name is a provider/session issue to resolve, not a reason to permit a second name entry. No database migration is required.
