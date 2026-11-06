# Duplicate signup email fix

November 6, 2026

Previously the Next signup proxy checked only adult/Terms eligibility, then forwarded every request to hosted Neon Auth. A provider can send verification mail during signup before the frontend detects a duplicate/incomplete-registration result. The installed Better Auth signup implementation can return a synthetic success for an existing email when verification is required; its OTP signup hook can send mail for a successful response containing an email. This explains why a UI error alone cannot prevent mail. The actual hosted provider implementation was not inspected or exercised. [Better Auth email/password behavior](https://better-auth.com/docs/authentication/email-password).

The existing registration-check endpoint now also validates the submitted email and checks for an existing application account or Auth-only identity. It performs parameterized, boolean-only reads of the configured database's `public.users` and `neon_auth.user`; it neither returns provider identity/profile details nor writes to those tables. Duplicate checks are case-insensitive and input whitespace is trimmed. Email existence is intentionally reflected in the duplicate response, consistent with the requested signup behavior; no account details, verification status or identifiers are disclosed.

The Next proxy forwards the email with eligibility fields and returns 409 before invoking hosted signup when the preflight finds a duplicate. Directory/check failures fail closed with 503 rather than sending signup anyway. Existing identities should sign in or use the explicit verification/completion flow. Explicit verification-code requests and sign-in still go through the original provider handler, retaining its origin/session/CSRF controls. Email verification enforcement remains intact.

This fixes known duplicate attempts through TutorME's signup pages. It does not control direct calls to the hosted provider or make the preflight atomic with hosted signup: two simultaneous first-time requests can both pass before either identity exists. Provider-level mail behavior remains necessary to eliminate that race universally. No provider settings, identities, credentials or account data were changed. No real mail delivery test was performed.

Files: `backend/app/schemas/user.py`, `backend/app/routes/policies.py`, new `backend/app/services/signup_check.py`, `frontend/app/api/auth/[...path]/route.ts`, new `frontend/lib/auth/signup-handler.ts`, and isolated tests in `backend/tests/test_signup_preflight.py` and `frontend/tests/signup-handler.mjs`.

Validation: 83 backend tests passed; 1 live PostgreSQL test skipped. Four new frontend proxy tests passed, verifying provider exclusion for duplicates/failures, original-request forwarding for new emails and preservation of explicit verification/sign-in. TypeScript and focused ESLint checks passed. Backend directory tests use an attached in-memory SQLite provider schema; no configured Neon connection, signup, email, migration or live database write was performed.

Restart both frontend and backend to load this change. The backend database role must be able to read `neon_auth.user.email`; no new privilege was granted here. A missing/inaccessible provider table yields a safe signup error. Frontend and backend must still point to the same branch. No new configuration variable is required.

## Form recovery correction

A subsequent review found that SignupForm marked an identity as created on any thrown signup error and disabled submission permanently. It now records creation only after confirmed provider success, tied to the submitted email. Returned and thrown duplicate/validation errors leave the form retryable; editing input dismisses stale errors. Changing email permits a fresh signup attempt. A confirmed identity whose profile creation failed can retry Finish account setup without another provider signup. Password fields no longer gate that completion retry.

Signup and login use a shared request runner that releases its in-flight lock in `finally`, including after provider errors and exceptions. Form-level synchronous guards also prevent rapid double submits while later account checks are pending. Login errors remain actionable; a successful sign-in followed by a temporary account-status failure offers Continue to retry only the status lookup. Session-expiry responses require fresh sign-in. Required email/password inputs prevent empty login submissions.

Failed policy/status loads now have an explicit requirements retry, with fresh Terms acceptance after reloading. Verification forms reject rapid repeats, validate the email before a resend, and release their pending state after wrong-code/network errors. No automatic resend was introduced.

Additional frontend changes: `components/SignupForm.tsx`, `app/(landing)/login/page.tsx`, `components/VerifyEmail.tsx`, new `lib/auth/form-attempt.ts`, and `tests/auth-form-attempt.mjs`. All 18 frontend Node tests pass, including seven new error/retry/concurrency checks. Focused lint and TypeScript/production build pass. These use mocked provider responses; no live signup, login, mail delivery, database write or provider configuration change was performed. Backend behavior was unchanged in this form-only correction.
