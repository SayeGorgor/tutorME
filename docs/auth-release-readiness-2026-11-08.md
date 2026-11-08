# Authentication release readiness — November 8, 2026

**Recommendation: BLOCKED for production deployment.** Local functional checks pass, but production build completion, live PostgreSQL concurrency/migration execution, and hosted authentication acceptance remain unverified. No new application-code fix was necessary. This report supplements [Task 1](auth-hardening-2026-11-08.md).

## Scope and executed checks

Reviewed the full tracked diff against HEAD (the pre-hardening implementation) and the untracked Task 1 report. Only the identity verifier, its tests and authentication documentation differed. No unrelated changes were present at the start of Task 2. The verifier still uses fixed EdDSA, required expiration/issuer/audience/subject, optional issued-at/not-before validation, ten-second skew and existing role/ownership guards. Task 2 adds only this report; Task 1 files are preserved.

| Check | Exact result |
| --- | --- |
| Complete backend unittest discovery, after final JWKS test | 134 tests: 131 passed, 0 failures/errors, 3 skipped; 3.824 seconds |
| Frontend Node tests | 51 passed, 0 failed, 0 skipped/cancelled/todo |
| TypeScript `npx.cmd tsc --noEmit` | Exit 0 |
| ESLint `npm.cmd run lint` | Exit 0; 0 errors, 4 warnings |
| Production `npm.cmd run build` | Exit 1; three font-fetch errors, build incomplete |
| Alembic `heads` | Exit 0; single head `f83d2a19b506` |
| Alembic `upgrade head --sql` | Exit 0; PostgreSQL SQL generated through head, no database connection |
| `git diff --check` | Passed |
| Independent Node HTTPS request for Inter CSS | Transport error `EACCES` |

ESLint warnings are existing unused `id`/`tutorId` bindings in `frontend/app/(protected)/tutor/profile/page.tsx` at lines 117 and 443. Existing Node module-type and Starlette/httpx deprecation warnings remain. Node v26.13.0 and npm 11.20.0 were used. Python dependencies remain those verified in Task 1.

Backend discovery ran with synthetic process settings, SQLite, and `TUTORME_RUN_POSTGRES_TESTS` removed. No production credentials/database were used. Frontend build loaded the existing `.env.local` through Next.js; it was not modified or printed. Test/build output and generated offline SQL were inspected locally and temporary output files removed; no tokens or credentials are retained here.

Reproduce isolated checks from `backend` in PowerShell:

```powershell
$env:DATABASE_URL='sqlite://'
$env:CSC_LOCATION_API_KEY='test'
$env:CSC_API_URL='https://example.test'
$env:NEON_AUTH_BASE_URL='https://auth.example.test'
$env:NEON_AUTH_JWKS_URL='https://auth.example.test/jwks'
Remove-Item Env:TUTORME_RUN_POSTGRES_TESTS -ErrorAction SilentlyContinue
.\.venv\Scripts\python.exe -m unittest discover -s tests
```

From `frontend`, run each command and require its exit code to be zero:

```powershell
node --experimental-strip-types --test tests/*.mjs
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

## Build diagnosis and approved-environment procedure

The unchanged root layout imports Geist, Geist Mono and Inter through `next/font/google`. Next.js 16.4.5 reaches production compilation but cannot connect to Google Fonts CSS endpoints for all three. The standalone Node HTTPS probe also fails with `EACCES`, outside Next.js. This establishes an environment network-access blocker; there is no evidence the JWT patch or font declarations caused it. The precise host policy denying access was not independently identified. Proxy variables and custom Node CA configuration were absent (values were never printed).

The installed Next.js font guide confirms the font integration downloads and self-hosts assets. CSP changes would not fix a server-side build fetch. Fonts, layout, CSP and TLS verification were preserved.

In an approved network-enabled builder, use the same source, lockfile and approved staging configuration. Install with `npm.cmd ci` if a fresh environment needs dependencies. Permit HTTPS/DNS to `fonts.googleapis.com` and `fonts.gstatic.com` and the package registry when installing. Configure the organization's approved proxy/CA if required; do not disable certificate validation. First verify a Node HTTPS request to the failing CSS URL returns 200:

```powershell
node -e "require('https').get('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap',r=>{console.log(r.statusCode);r.resume();process.exitCode=r.statusCode===200?0:1}).on('error',e=>{console.log(e.code);process.exitCode=1})"
npm.cmd run build
```

Require an exit-zero complete build, including type checks and page generation, and retain redacted CI evidence. Successful CSS retrieval alone is insufficient; the build must also retrieve font files. If compilation reveals another failure after fonts become reachable, investigate it separately before release. No font mocks or bypass flags count as production build acceptance.

## PostgreSQL integration review

All three `PostgreSQLConcurrencyTests` remain skipped because no independently verified, explicitly authorized disposable target was supplied. Existing `.env` configuration is not evidence of permission or disposability. No hosted database connection or write was attempted.

The guard requires both process-only opt-ins equal to `1`, expected project/branch/database identifiers, a matching psycopg URL/database, direct endpoint and explicit TLS. Known production/development branches and endpoints are excluded. Each setup, worker and cleanup connection checks server-reported project/branch/database in a read-only transaction and rolls back before subsequent work. Missing/unknown/mismatched identity fails closed. Existing isolated guard tests exercised missing approvals, known forbidden branch, identity mismatch and rollback successfully in this full run.

These are important safeguards, but flags and user-supplied expected identifiers do **not** independently prove a target disposable. The denylist cannot identify every possible production database. A caller who incorrectly labels another production target can defeat that operational distinction. Therefore no live execution is approved by this review; an operator must verify and authorize the exact target out of band before setting flags. Guards were not weakened or changed.

The three races cover two overlapping bookings for one tutor, competition between online/in-person formats, and one student competing across two tutors. Workers create pending requests and tutors attempt confirmation. Expected outcomes are one 200 and one 409, persisted confirmed/pending rows and intact quote snapshots; loser rollback is checked. Despite its name, `test_student_cannot_confirm_overlapping_different_tutors` uses tutor actors to test student schedule overlap; it is not a test of a student attempting the tutor-only confirm action. Wrong-role and wrong-user authorization are covered separately by SQLite API regression tests, not these three PostgreSQL races. Live PostgreSQL authorization remains part of staging acceptance.

Unique schemas isolate fixtures. Timeouts bound connections, statements, locks, barriers and worker lifetime. Workers stop before cleanup; cleanup rechecks target identity. Test data is synthetic. Existing tests use `Base.metadata.create_all`, so passing them would not prove migration compatibility.

Offline validation used a synthetic unreachable PostgreSQL URL and `alembic upgrade head --sql`, never online mode. It generated the full revision chain and booking snapshot constraints through the single head. This validates migration rendering only, not PostgreSQL execution, constraints under load or ORM/schema equivalence.

Before migration-backed acceptance, independently authorize an empty disposable **database**, not merely a schema on an established target. Record its identity privately and verify via the existing read-only guard. Run Alembic upgrades in that isolated environment with a least-privileged role restricted to it, then verify `alembic current` equals head and run `alembic check` against model metadata. The current Alembic environment reads `settings.database_url` and lacks the concurrency harness's identity guard: never run it with inherited application `.env` defaults. A reviewed runner must bind migrations to the already-verified connection or reverify the exact target before running. PostgreSQL enums and unqualified migration tables make simply setting `schema_translate_map` on the concurrency fixture an inadequate migration test.

Re-run the existing guarded races only after that authorization. They still generate separate ORM schemas; add a separately reviewed migration-backed fixture before claiming the races ran against Alembic-created tables. No online migration command was executed or sanctioned here. Do not use `alembic stamp` to hide missing migrations or downgrade an established database for testing.

## Provider compatibility and deployment configuration

[Neon documentation](https://neon.com/docs/compute/functions/authentication) reconfirms EdDSA and short-lived 15-minute Managed Better Auth JWTs with origin-based issuer. Current guidance retrieves a JWT via `getSession().data.session.token`; the Task 1 statement that this page illustrates `authClient.token()` no longer matches the current page. The installed 0.5.0-beta SDK still supports the application's existing `/token` flow. No SDK migration is needed for this patch. Hosted service configuration/version and actual staged token claims are still unverified. [PyJWT 2.14.0](https://pyjwt.readthedocs.io/en/2.14.0/api.html) supports required claims and fixed algorithms; isolated cryptographic tests passed.

Required deployment checks, without changing production settings during this task:

- Backend `NEON_AUTH_BASE_URL` and `NEON_AUTH_JWKS_URL` must point to the same intended provider branch; expected issuer/audience is the base URL origin. Use HTTPS and trusted configured endpoints. Required token claims are `exp`, `iss`, `aud`, `sub`; `iat`/`nbf` validate when present.
- Frontend server `NEON_AUTH_BASE_URL` must match that provider, and its existing `NEON_AUTH_COOKIE_SECRET` must remain securely configured. `NEXT_PUBLIC_API_URL` must identify the intended backend. No secret belongs in a public variable.
- Confirm trusted origins/OAuth redirects/email callbacks and HTTPS cookie behavior on staging. Backend CORS currently allows localhost:3000 and `https://tutorme2.vercel.app`; another staging origin needs an explicitly reviewed allowlist change before browser acceptance. CORS is not authorization.
- Backend needs outbound JWKS HTTPS access within the five-second fetch timeout, reliable system clocks, approved application database connectivity and the pinned dependencies. Builder needs font network access. No new environment variable or migration is required by JWT hardening.

## Hosted staging checklist — all BLOCKED, not executed

No authorized staging accounts, independently verified disposable database or staging provider project was supplied. Use synthetic identities or explicitly approved staging accounts only. Record pass/fail, timestamp, app revision and redacted error category for each item; never record raw credentials, JWTs, cookies or sensitive browser traces.

| Acceptance case | Required evidence before marking passed |
| --- | --- |
| Email/password | Signup, verified login, wrong-password rejection and successful retry; password reset/recovery using staging mail |
| Email verification | Unverified account cannot finish setup; verification link permits continuation without creating a second account |
| Google OAuth through Neon | Correct staging redirect; authenticated Neon token reaches backend; no direct Google token accepted |
| Student onboarding | Self-managed student setup persists identity/name/consent; interrupted and repeated completion preserves the same record |
| Tutor onboarding | Tutor setup and dashboard work; interrupted setup resumes without role change or duplicate identity |
| Expiration | Previously issued token rejects after exp plus ten seconds; missing-exp/invalid tokens reject without granting access |
| Refresh/persistence | Normal refresh after JWT lifetime, reload and browser reopen work while provider session remains valid; expired provider session cannot mint fresh credentials |
| Logout/protected routes | Cookie/session cleared; protected navigation and new API requests denied; separately record already-issued JWT validity window |
| Roles/wrong-user requests | Two students and two tutors: cross-profile/availability writes denied; only booking participants read/cancel, only booked tutor sets details/confirms; guests denied |
| Booking workflow | Eligible student creates, reads and cancels; tutor accepts/declines/completes; private meeting data absent from public responses |
| JWKS rotation | Authorized staging operator rehearsal only: old/new key behavior and unknown-key cooldown recovery; successful JWT verification after refresh |
| JWKS outage/recovery | Fault injection scoped to staging network, not production/provider settings: fresh cached known key works, missing/expired cache rejects, recovery restores access |

## Risks, rollback and release gate

Offline JWTs remain valid after logout/reset/revocation until expiration plus skew, normally about 15 minutes. JWKS failure returns 401 and can appear as a login problem. A new rotated key may be rejected during the library's 30-second cooldown. A five-second network timeout is not a total wall-clock budget for every authentication operation. Rate limiting and dependency advisory review remain separate; this task does not certify those controls. SQLite/mocked HTTP cannot establish hosted provider or PostgreSQL behavior.

Keep the previous application artifact and its compatible environment for rollback. This authentication patch needs no database rollback or secret/provider change. Reverting restores acceptance of signed tokens without expiration, so pause rollout and investigate before choosing rollback. Do not weaken verification to recover login. Existing migration downgrades intentionally refuse destructive rollback; they are unrelated to this patch and must not be invoked as its rollback.

Release can be reconsidered after an exit-zero real production build, authorized live PostgreSQL races and migration-backed schema validation, and all hosted acceptance rows have recorded evidence. Monitor redacted authentication/JWKS errors and registration failures during any later approved canary. This task stops at local verification: no deployment, commit, push, production database operation, credential change or provider-setting change occurred.
