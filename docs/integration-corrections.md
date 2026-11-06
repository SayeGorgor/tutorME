# TutorME integration corrections before database testing

November 6, 2026

Source corrections are complete. **54 isolated backend tests pass; one live PostgreSQL test is deliberately skipped. Booking remains disabled.** This report updates the source findings in `database-integration-readiness-audit.md`; that audit remains the historical database snapshot. No live database inspection was repeated.

## Safety boundary

No migrations, database imports, configured-database writes, Neon identity creation/deletion, legacy-account classification, or real browser signup tests were performed. Neither environment file, `BOOKINGS_ENABLED`, nor `LEGAL_PUBLICATION_APPROVED` was changed. Unit tests created synthetic records in in-memory SQLite only. The pre-existing demo-seed regression exercises its function against those isolated fixtures, not the configured database. No credentials were printed.

## Corrections

### Registration recovery and authoritative email

Added authenticated GET `/api/users/registration-status` and POST `/api/users/complete-registration`. An Auth-only identity can sign in and finish setup without signing up again. Login checks status; protected-page user loading redirects missing application users to `/complete-registration`. That page lets the user choose student/tutor, supply names, and expressly accept current Terms and adult eligibility. It does not infer acknowledgment from a provider account or fabricate earlier timestamps.

Completion derives subject and email from the existing cryptographically validated identity. It does not accept another user's identity or an authoritative email in its payload. The legacy registration endpoint delegates to the same service and rejects supplied identity/email mismatches. Email requires a signed `email` plus a strictly boolean true `emailVerified` or `email_verified`; absent claims, unverified email, string flags, and conflicting flags fail closed. Existing EdDSA signature, issuer and audience checks remain intact; subject must be a nonempty string. No privileged provider lookup or identity deletion was introduced.

Successful retries return the same application user without rewriting role, names, email, purpose, or acknowledgment times. Different role/purpose conflicts are explicit. Unique-constraint races roll back and return only the winner for the authenticated subject; another email owner's record is never returned or reassigned. A database commit failure gives an actionable retry response. Users with existing incomplete eligibility use the existing explicit account-settings acknowledgment flow.

Signup now distinguishes provider creation from application completion, preserves a created sign-in identity on application/network failure, and links to verification, login and completion. Added `/verify-email` using the installed Neon client's OTP verification/resend methods. No email is sent until the user explicitly requests it. Verification-link projects can use their emailed link and then sign in again. Fresh sign-in refreshes verification claims; completion stays blocked until the signed token reports verified email.

### Pending booking formats

An existing pending request at the same student/tutor/start is returned only for the same mode. A different mode returns 409 with instructions to cancel the earlier request before changing format. Reusing an idempotency key with another payload still conflicts. Existing availability, eligibility, time-window, participant locking and confirmed-overlap checks remain in place.

### Deletion lifecycle

`pending` and `under_review` block new booking requests and confirmations for either participant. `rejected`, `processed` and `completed` are closed and no longer block solely because a historical request exists. Unknown states fail closed for manual review. Other account/booking eligibility rules still apply.

GET deletion status includes `blocksNewBookings` and `canSubmit`; account settings reflects them. Active duplicate requests are idempotent. Closed records cannot be overwritten by resubmission: return 409 and direct the user to the privacy operator for another review. Request creation locks the user's row; authorization remains bound to the current user. No administrative lifecycle endpoint, deletion job, schema change, or actual account deletion was added. Operators must deliberately assign reviewed status values; a closed status alone does not delete or restore an account.

### Disposable PostgreSQL test

The live test now requires all of:

- `TUTORME_RUN_POSTGRES_TESTS=1`
- `TUTORME_TEST_DATABASE_IS_DISPOSABLE=1`
- `TUTORME_TEST_DATABASE_URL` using `postgresql+psycopg`, a direct endpoint and explicit TLS
- `TUTORME_TEST_PROJECT_ID`, `TUTORME_TEST_BRANCH_ID`, `TUTORME_TEST_DATABASE_NAME`

It permanently refuses branch `br-royal-bird-ax5hkimq` and its inspected endpoint, regardless of approval flags. Actual Neon project/branch/database are compared in a verified read-only transaction before schema creation, on each worker connection, and before cleanup. Read-only verification always rolls back. Mismatch means no schema write on that connection. Tests cover these guards using mocks, without connecting to Neon.

Connection timeout is 5 seconds, statement timeout 15 seconds, lock timeout 5 seconds, idle transaction timeout 15 seconds and barrier timeout 5 seconds. Confirmations use spawned processes with a shared 30-second deadline. Cleanup stops workers before dropping the generated `tutorme_test_<uuid>` schema. Unstarted workers are handled safely. Cleanup rechecks target identity and uses only the generated schema; it never drops `public` or `neon_auth`. A connectivity/cleanup failure can still require separately reviewed inspection of leftover test schemas. Driver/server termination is bounded locally but does not guarantee immediate remote cancellation during a network failure.

**The live test was not executed.** Actual PostgreSQL locking, enum isolation, failure cleanup, and migration correctness remain unverified. It still uses ORM `create_all`, not Alembic, and cannot establish historical migration safety.

### Location and tutor subjects

Google's existing widget remains the primary location input. No additional autocomplete or per-keystroke catalog request was added. Selected places still resolve to existing independent `service_areas`; Google coordinates/text are not imported into the matching catalog. Empty catalog resolution now returns 503 with `LOCATION_CATALOG_UNAVAILABLE` and a clear suggestion to search online tutors. Unsupported or ambiguous locations retain their distinct errors when a catalog exists. Frontend API errors now display structured backend messages and codes.

Reviewed the Census importer and owner-authorized tutor profile `subjectIds` update: both remain intact. Existing tests cover subject updates, unknown IDs, ownership checks and subject-filtered search. No catalog, tutor-subject association, or real tutor record was populated or modified. The last audit's empty-catalog/empty-association findings remain blockers until an approved dev import and explicit subject assignment.

## Files changed in this correction pass

Backend:

- `app/actions/actions.py`: authenticated subject and incomplete-registration response.
- `app/schemas/user.py`: completion input and shared validation.
- `app/routes/users.py`: completion/status endpoints and deletion semantics.
- `app/routes/locations.py`: empty-catalog response.
- `app/services/registration.py`: trusted email and transactional completion/retries.
- `app/services/deletion.py`: centralized lifecycle classification.
- `app/services/bookings.py`: mode conflicts and deletion eligibility.
- `tests/test_locations.py`, `tests/test_marketplace.py`: verified-claim registration fixtures.
- `tests/test_integration_corrections.py`: focused source regressions.
- `tests/postgres_test_guard.py`, `tests/test_postgres_booking_concurrency.py`: target verification and bounded isolated race test.

Frontend:

- `lib/types.ts`, `lib/api/api-helper.ts`, `lib/api/registration.ts`: completion/status types, API calls and structured errors.
- `lib/context/UserContext.tsx`: Auth-only recovery redirect.
- `components/SignupForm.tsx`, `components/CompleteRegistration.tsx`, `components/VerifyEmail.tsx`: signup recovery, completion and verification UI.
- `components/AccountSettings.tsx`: deletion lifecycle display.
- `app/(landing)/login/page.tsx`, `app/(landing)/verify-email/page.tsx`, `app/(protected)/complete-registration/page.tsx`: routing.

Documentation: this report. Other pre-existing working-tree changes were preserved.

## Validation performed

| Check | Result |
| --- | --- |
| Isolated backend unittest discovery | 55 discovered: 54 pass, 1 live PostgreSQL test skipped |
| Registration regressions | Verified claims, same-user retry, role conflict, failed commit/retry, simulated unique race and unverified rejection pass |
| Booking/deletion regressions | Mode conflict, exact retry, closed vs active deletion, confirmation restrictions and record preservation pass |
| Safety/location regressions | Missing approvals, protected/mismatched actual target, read-only rollback, secret-free target representation and empty catalog pass |
| Frontend ESLint | 0 errors; 10 existing unused-variable warnings in tutor profile page |
| Next route type generation / TypeScript noEmit | Pass |
| Google loader tests | 4 pass; mocked browser/script, no Google request |
| Next production build | Pass, including completion and verification routes |

Backend discovery was run with process-local `DATABASE_URL=sqlite://` and live-test opt-in removed. Fixtures also replace Auth/CSC endpoints with synthetic test URLs. The suite uses mocked authenticated dependencies; this proves application behavior, not live Neon token contents, provider email delivery, browser session cookies, or PostgreSQL concurrency. Frontend provider flows were typechecked/built, not exercised against real identities.

## Manual Neon Auth setup and remaining dependencies

1. Select an explicitly approved development branch and align its database, Auth, JWKS, callback/trusted origins and cookies. Do not test signup against the inspected protected branch.
2. Enable/review email verification in the dev project's Auth settings. Use the supported verification-code configuration or a reviewed custom email provider for links. Test delivery only to controlled approved addresses. Resend remains subject to provider rate limits and configuration.
3. Verify a freshly issued dev JWT includes signed `email` and boolean `emailVerified` (or supported equivalent `email_verified`). Do not paste tokens into logs or tickets. Missing claims block new completion intentionally; investigate provider configuration/support rather than trusting the client's email or unsigned session data. Managed Neon custom JWT payloads are not assumed available.
4. Direct hosted-provider signup remains outside the Next proxy. It can create an Auth-only identity without TutorME's acknowledgments. It cannot create an application user through the secured backend without explicit adult/Terms acceptance, or bypass booking eligibility. This source correction does not claim provider-level age/Terms enforcement. Resolve provider-directory/privacy requirements before release; CORS and email verification do not solve that issue.

Official references: [Neon JWT plugin and signed user claims](https://neon.com/docs/auth/guides/plugins/jwt), [email verification](https://neon.com/docs/auth/guides/email-verification), [authentication flow](https://neon.com/docs/auth/authentication-flow).

## Safe next steps — require separate target/mutation approval

1. Confirm dev/disposable target identity and data provenance in Console. Record expected IDs independently; provide connection secrets privately in a temporary process environment. Keep the inspected branch excluded. A clone can contain real account/Auth data; prefer synthetic fixtures and review mail settings.
2. Recheck its current Alembic revision read-only. The inspected target already has head `e47b901ad682`; this correction adds no migration. Do not replay migration SQL or stamp/reset history. Migration testing on another target is a separately reviewed operation.
3. Approve Census input vintage/provenance and a dev-only import; approve explicit dev tutor subject assignments. No seed or legacy-profile classification is needed for this source change.
4. For an independently verified disposable target, after explicit schema create/insert/drop approval, set all six test settings listed above in the process environment and run from `backend`:

   ```powershell
   .venv/Scripts/python.exe -m unittest discover -s tests -p test_postgres_booking_concurrency.py -v
   ```

   This command is **not executed or approved by this report**. It creates fixture data and drops its random schema with CASCADE. Expect one 200 and one 409; inspect cleanup read-only afterward. The earlier audit's test command is superseded by these additional mandatory flags/identity checks. Keep test variables out of `.env`, and close the temporary session afterward.
5. Approve dev browser/API mutations separately. Exercise verified student/tutor signup; no-session verification; interrupted app creation; authenticated completion/retry; ownership and stale Terms failures; missing provider claims; subject assignment; location unavailable/unsupported/ambiguous selections; deletion lifecycle; and booking mode/idempotency behavior. Browser email verification may send provider mail.

Real booking remains blocked on approved environment selection, provider verification/recovery acceptance, direct-provider privacy decisions, independent catalog and tutor subjects, legacy tutor provenance/eligibility, and a successful actual PostgreSQL race/isolation test. Deletion processing remains a reviewed manual operation. This pass ends with source corrections and isolated validation only.
