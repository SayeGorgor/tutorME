# TutorME database and integration readiness audit

November 6, 2026 - America/New_York

**The configured database is already at Alembic head. There are no pending source migrations on that target. The independent location catalog is empty. Real booking must remain disabled.**

This report supersedes the earlier implementation report's historical statements that migrations were unapplied or the DB could not be reached. It records the current inspected state, without attributing who applied the migrations or when.

## 1. Scope and safety

Performed: source/configuration inspection, offline SQL generation into memory, public local API GET requests, and PostgreSQL metadata/count queries. Sandbox networking initially denied the database connection; the authorized read-only inspection succeeded outside that restriction. Each live inspection used `SET TRANSACTION READ ONLY`, verified `transaction_read_only=on`, applied local statement/lock timeouts, and rolled back.

Not performed: migrations, seeds/imports, concurrency tests, account/booking changes, policy approval, or booking enablement. No connection URI, password, JWT, API key or session secret was printed. No source or environment configuration was edited; only this report was written.

## 2. Current database and environment

| Item | Verified result |
| --- | --- |
| Neon project ID | `still-math-23486169` from `current_setting('neon.project_id', true)` |
| Neon branch ID | `br-royal-bird-ax5hkimq` from `current_setting('neon.branch_id', true)` |
| Project/branch display names | Not exposed by `neon.project_name` / `neon.branch_name`; confirm in Console. Do not infer a name from the ID. |
| Endpoint ID | `ep-sparkling-voice-ax3w37ou` |
| Configured hostname | `ep-sparkling-voice-ax3w37ou-pooler.c-4.us-east-2.aws.neon.tech` |
| Database | `neondb`, verified with `current_database()` |
| Connection | postgresql+psycopg, pooled, port 5432, sslmode=require |
| PostgreSQL | `18.6 (ac70818)` |
| Live Alembic revision | **e47b901ad682** |
| Source head | **e47b901ad682**, one linear head |
| Development/production classification | **Unconfirmed.** Knowing the identifiers does not establish that the branch is disposable. Treat it as protected for writes until the owner confirms its purpose. |
| Auth alignment | Frontend/backend Auth hosts match, JWKS host matches Auth host, and Auth endpoint prefix matches database endpoint. neon_auth schema exists. Provider settings remain unverified. |
| Spatial extensions | No PostGIS or btree_gist installed. Neither is required by the current location queries. |

Live public tables include users, tutor_profiles, tutor_availabilities, subjects, reviews, alembic_version, service_areas, tutor_subjects, bookings and deletion_requests.

| Table | Rows |
| --- | ---: |
| users | 7 |
| tutor_profiles | 4 |
| tutor_availabilities | 10 |
| service_areas | **0** |
| tutor_subjects | **0** |
| bookings | 0 |
| deletion_requests | 0 |

All expected account-safety columns exist: nullable account_purpose, adult_attested_at, terms_version, terms_accepted_at. All tutor mode/location columns and non-null is_demo exist. Booking/deletion tables have their expected columns and timezone-aware timestamps. Inspected foreign keys, unique/check constraints and required indexes exist; inspected constraints report validated=true. This is focused verification, not an exhaustive autogenerate drift audit of every historical column/default.

## 3. Migration and generated SQL review

```text
b292ed7c70dc -> 589c8535b65d -> 8a25eae11095 -> 856c251d9a79
-> 9d45a3cef40a -> b3879da82696 -> 202a56c8dc07 -> 9d1c25417d93
-> 8d02a9a967bc -> 81099c270fbc -> c21a76e9d304 -> e47b901ad682
```

Both docs/location-migration.sql and docs/account-booking-migration.sql match current offline-generated SQL after whitespace normalization. Generation was into memory; nothing was executed against PostgreSQL.

| Revision | Changes and safety |
| --- | --- |
| c21a76e9d304 | Depends on 81099c270fbc and existing tutor/subject tables. Creates independent service_areas and tutor_subjects. Adds modes, area FK, Place ID, radius and meeting preference. Defaults existing tutors to online=true/in-person=false, radius=25; no geographic/subject assignments guessed. Checks cover coordinates, at least one mode, in-person area and radius bounds. |
| e47b901ad682 | Depends on c21. Adds nullable account acknowledgments/purpose, is_demo=false, bookings, deletion_requests. Does not fabricate age/Terms records or classify existing users as fictional. Includes positive-duration/mode/status checks, per-student idempotency uniqueness, restrictive participant FKs and time indexes. |

**Pending on this inspected target: none.** Do not replay the SQL files: CREATE TABLE / ADD COLUMN are not idempotent. Their conditional alembic_version UPDATE is not a guard against starting from the wrong schema. Do not use stamp to bypass mismatches.

The new DDL uses ordinary PostgreSQL types, transactional schema operations and B-tree indexes, with no spatial/payment extensions. ALTER TABLE, index creation and constraint validation can still lock populated tables. Use a reviewed change window and bounded timeouts on any future target. Both new downgrade functions deliberately refuse automatic destructive rollback; plan an approved dev snapshot restore or reviewed forward fix.

### Historical hazards on older targets

- **81099c270fbc drops and recreates availability start/end and created_at columns.** On a populated earlier database this can lose values and fail adding non-null minute columns. It is already applied here; do not rerun it. A target below it needs a separate data-preserving conversion plan.
- 9d45a3cef40a adds non-null auth_id without backfill. 8a25eae11095 adds non-null intro/price without backfill. Older role changes also need review on populated historical targets.
- b3879da82696 changes BIGINT auth_id to VARCHAR without explicit PostgreSQL USING. Verify the full chain on an empty disposable DB rather than assuming ORM create_all tests validate it.
- Older created_at string columns use literal `now()` defaults; do not assume those contain reliable historical timestamps.

Do not rewrite already-applied revision history during an audit. Propose reviewed corrective migrations where needed.

## 4. Location catalog and subject readiness

**No Census catalog is currently available:** service_areas has zero rows and no source/country groups. This establishes no currently imported dataset, not that no import ever happened. No Gazetteer input files were found in the repository; external operator files were not searched.

The official Google widget no longer issues per-keystroke `/api/locations/areas?q=...` requests. Selection still uses POST /api/locations/resolve to find an independent city/state or ZIP record; /api/locations/areas/{id} restores filters. Both require the catalog. With zero rows, Google can suggest a location but selection cannot resolve it for matching. Do not remove the matching table to address an obsolete autocomplete error.

Import only reviewed official Census national places/ZCTA files into an approved development target. Record source/year and file provenance/checksum. The importer accepts pipe/tab formats and checks coordinates; it inserts missing IDs without overwriting points. IDs include year, so importing multiple vintages creates duplicate choices that the resolver can reject as ambiguous. Representative city/ZIP points are neither residences nor driving distances; do not populate them from restricted Google coordinates.

The tutor_subjects association is also empty. Subject-filtered searches will currently exclude all four tutors until owners or approved dev fixtures select subjects. This is a data-readiness issue, not a connectivity failure.

## 5. Legacy tutor classification

| Profile ID | User ID | is_demo | Exact old seed template match | Required decision |
| --- | --- | --- | --- | --- |
| 5 | 11 | false | yes | Owner must establish fictional vs genuine. |
| 6 | 12 | false | no | Content differs; do not overwrite/reclassify automatically. |
| 7 | 14 | false | yes | Owner classification required. |
| 8 | 15 | false | yes | Owner classification required. |

All four are outside the new reserved demo identity namespace and lack adult/Terms acknowledgment timestamps. Template similarity is evidence of old seeded content, **not proof that an account holder is fictional**. No names, emails, auth IDs or profile text are exposed here.

No current tutor is marked demo. The revised opt-in demo seed has not populated this target. Keep all four accounts unchanged until the owner supplies per-ID classification. Missing acknowledgments already prevent genuine booking for these tutors independently of the global flag. No demo-classification UPDATE or seed operation is proposed for this target.

## 6. Configuration and running API

| Setting | Observation |
| --- | --- |
| DATABASE_URL | Present; read from backend .env, no process override during audit. Target IDs above; purpose unconfirmed. |
| Direct migration URL | No separate supported setting. Alembic env.py uses DATABASE_URL; temporarily supply an approved direct connection for admin work. |
| Auth/JWKS URLs | Present; frontend/backend/DB endpoint alignment checks pass. Provider settings not inspected. |
| NEON_AUTH_COOKIE_SECRET | Present; at least 32 characters. Value not displayed. Use separate reviewed dev cookie/session configuration. |
| NEXT_PUBLIC_API_URL | Present; localhost:8000. Deployment requires environment-specific reachable origins, not a developer localhost. |
| Google browser API key and map ID | Present. Validity, billing, API/referrer restrictions and map ownership are not established by presence. |
| CSC_LOCATION_API_KEY / CSC_API_URL | Present for legacy route/settings. |
| Operator / privacy contact | Previously supplied Saye Gorgor / tutormebot@gmail.com are configured. |
| Effective date / Terms version | 2026-11-05 / 2026-11-05-v1. No date/version change is needed for this audit. |
| LEGAL_PUBLICATION_APPROVED | true, reflecting the earlier user approval; untouched. |
| Policy ready | true in current settings and running local API. |
| BOOKINGS_ENABLED | Not explicitly declared in backend .env; false by application default. Running API also reports false. |
| Minor profiles/bookings | Disabled. |
| TUTORME_TEST_DATABASE_URL / disposable flag | Not configured; real PostgreSQL test remains skipped. Current test reads process environment, not dotenv. |
| Neon management API / CLI | No NEON_API_KEY in inspected configuration, no CLI found. SQL provided IDs but not display names/default/protected status. |

The running localhost API's OpenAPI document contains policies, user registration, bookings, deletion-request and location-resolution routes. This confirms code is served, not end-to-end auth correctness.

Pydantic Settings rejects unexpected dotenv keys by default. Keep unrecognized test/management/direct-URL variables in process environment unless Settings is explicitly extended. Neither env file was changed.

## 7. Risks requiring correction or a release decision

### P0 - before real-booking release

1. **Development target not approved.** Confirm Console names/default/protected state and select a separate disposable/dev branch before any mutation.
2. **Historical migration report is stale.** This DB is already at head; replaying DDL is inappropriate.
3. **Location catalog absent.** Import approved independent data into the chosen dev target before location acceptance.
4. **PostgreSQL race unverified.** SQLite tests do not prove production locking. Current overlap protection is application row locks, not a DB exclusion constraint against arbitrary SQL writes. Keep booking disabled pending a real race test.
5. **Direct-provider signup bypass.** The Next proxy validates adult/Terms fields, and app-user creation requires signed identity and acknowledgments. Direct calls to hosted Neon Auth do not pass that proxy. Current official Neon docs say signup is unrestricted by default and restricted signup support is forthcoming. Email verification is not adulthood/Terms verification. Do not assume a managed custom hook exists or fix this with frontend CORS. An Auth-only identity does not grant an app user or bypass backend booking eligibility, but provider-directory/privacy implications remain. See [Neon authentication flow](https://neon.com/docs/auth/authentication-flow).

### P1 - integration corrections/tests

6. **Split registration lacks recovery.** Auth signup and public.users creation are separate transactions. Verification-required signup may not yield a usable JWT immediately; app/network failure also leaves an Auth-only identity. Login then expects /users/me and returns a generic error. Review an authenticated completion/retry flow; do not delete identities as automatic compensation.
7. **Email binding is conditional.** Backend compares supplied email with JWT email only if that claim exists. A token without email permits an unverified client-supplied address. Establish a trusted provider lookup/claim/verification policy before claiming email ownership.
8. **Pending duplicate query omits mode.** A new format request for the same student/tutor/start can silently return an earlier pending booking with another mode. Correct/test payload semantics.
9. **Deletion status mismatch.** submit blocks any DeletionRequest row, though its message says a request is under review. A rejected/processed request would still block bookings. Define and implement status semantics before processing requests.
10. **Test flags do not prove target identity.** The disposable test has no project/branch allowlist or comparison with the normal application target. A mistaken URL plus flag could run it on this branch. Verify independently and strengthen guards in a separately approved change.
11. **Race test bypasses Alembic.** Base.metadata.create_all checks current ORM schema, not migration correctness/historical conversion. Validate migrations separately on a disposable target.

### P2 - operational follow-up

12. Prefer direct administrative connections; pooled app traffic can remain pooled. Confirm connection/session behavior, not just hostname conventions; see [Neon pooling guidance](https://neon.com/docs/connect/connection-pooling).
13. The race test has a barrier timeout but no explicit statement/lock timeout or future deadline. Configure bounded DB timeouts; inspect cleanup on failures.
14. Measure lower(name) prefix and geographic query plans after import. Existing ordinary name indexes do not optimize every expression. PostGIS is not an immediate requirement.
15. Retention/deletion processing and notifications remain manual/in-app. Parent profiles, minor bookings, payments, email notifications and atomic rescheduling remain absent by design.

These are findings, not code changes made during this audit.

## 8. Disposable concurrency test safeguards

File: backend/tests/test_postgres_booking_concurrency.py.

It requires explicit TUTORME_TEST_DATABASE_URL plus a flag exactly '1'; checks PostgreSQL dialect; creates a random tutorme_test_<uuid> schema; uses schema_translate_map; inserts synthetic users/tutor/availability/pending requests; races two confirmations expecting [200,409]; finally drops that unique schema with CASCADE and disposes the engine. Test-only feature flags are patched inside that process, not in .env or the running app. No genuine email is sent.

A compile-only review confirmed schema-translation placeholders for enum and table DDL. Actual isolation/cleanup still requires the first approved run. The test is not a migration test. DROP SCHEMA CASCADE is destructive even when test-scoped; never substitute public/neon_auth or a user-supplied schema. A role must permit schema create/drop. Cleanup failure can mask the first error; review leftover test schemas before any separately approved manual deletion.

No test was run in this audit, including SQLite discovery: the task requested a report before database-changing operations. The earlier 43 passes/1 skip/build results were not re-presented as newly executed tests.

## 9. Safe development sequence

1. Confirm current project/branch names and environment purpose in Console. Do not infer production/development from localhost or the endpoint slug.
2. Choose/create an explicitly approved development branch and disposable concurrency target. Record project, branch, DB and direct endpoint. A clone inherits current schema and may copy real users/Auth data; use synthetic identities and review Auth/mail behavior before test signup.
3. Supply a direct dev URL only in a temporary process environment. Verify project/branch/database/revision read-only. Dev DB, Auth and JWKS endpoints must align; do not retain original Auth URLs against a cloned public.users table.
4. A clone already at e47 needs no migration. A target at c21 needs only e47; at 81099 it needs c21 then e47. Older/unversioned targets require separate conversion review; no stamp/reset shortcut.
5. After approved schema changes, verify constraints/counts read-only. Do not blindly replay exported SQL. Bound timeouts and stop app writers during a change window.
6. Import only approved Census files into the dev DB and verify source/year/counts. Do not run seed scripts or classify legacy profiles in this procedure.
7. Execute concurrency test only on its confirmed disposable target; keep the running app booking flag false. Validate migration history separately from create_all.
8. Approve a specific dev browser/API mutation scope before creating auth identities, acknowledgments, bookings or deletion requests. Test provider signup can send verification mail even when booking email is absent.

The approval commands and prioritized acceptance checklist follow below.


## 10. Commands requiring review and approval - NOT EXECUTED

The new dev branch/URL must be selected and reviewed first. The current inspected branch is explicitly refused below. Never print credentials or paste a connection URL into command history.

### A. Select/create an approved environment

Creating a Neon development branch/compute is a control-plane write requiring approval of its source data and possible compute cost. Use Console to select/create a separate development branch in project still-math-23486169. Record its branch ID, display name, database and direct endpoint. No branch was created in this audit.

Start a new temporary PowerShell session with no inherited PGOPTIONS. Supply its approved direct URL through a hidden prompt:

```powershell
Set-Location 'C:/Users/Pokef/Projects/tutorME/backend'
$taskSecureUrl = Read-Host 'Approved development DIRECT PostgreSQL URL' -AsSecureString
$taskPrivateUrl = [System.Net.NetworkCredential]::new('', $taskSecureUrl).Password
$env:DATABASE_URL = $taskPrivateUrl -replace '^postgres(?:ql)?://', 'postgresql+psycopg://'
$env:TUTORME_APPROVED_DEV_BRANCH_ID = '<REVIEWED_NEW_DEV_BRANCH_ID>'
$env:PGOPTIONS = '-c lock_timeout=5s -c statement_timeout=60s'
# Do not echo these variables or save them in backend/.env.
```

### B. Mandatory read-only target guard

Define/call this before every proposed write command in the same temporary session. It verifies a separately approved branch, project, database, direct endpoint, TLS and allowable revision. It does not migrate:

```powershell
function Assert-TutorMEDevTarget {
@'
import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from app.core.config import settings
approved = os.environ.get('TUTORME_APPROVED_DEV_BRANCH_ID', '')
if not approved.startswith('br-') or approved == 'br-royal-bird-ax5hkimq':
    raise SystemExit('A separate reviewed development branch is required')
url = make_url(settings.database_url)
if '-pooler.' in (url.host or ''):
    raise SystemExit('Use the reviewed direct development endpoint')
if url.query.get('sslmode') not in ('require', 'verify-ca', 'verify-full'):
    raise SystemExit('An explicit reviewed TLS setting is required')
try:
    engine = create_engine(settings.database_url, connect_args={'connect_timeout': 10}, hide_parameters=True)
    with engine.connect() as conn:
        conn.exec_driver_sql('SET TRANSACTION READ ONLY')
        branch = conn.scalar(text("SELECT current_setting('neon.branch_id', true)"))
        project = conn.scalar(text("SELECT current_setting('neon.project_id', true)"))
        database = conn.scalar(text('SELECT current_database()'))
        if (branch, project, database) != (approved, 'still-math-23486169', 'neondb'):
            raise SystemExit('Target identity mismatch; do not write')
        revision = conn.execute(text('SELECT version_num FROM public.alembic_version')).scalars().all()
        if revision not in (['81099c270fbc'], ['c21a76e9d304'], ['e47b901ad682']):
            raise SystemExit('Older/unknown/multiple revisions require separate review')
        print('Approved target verified:', branch, database, revision)
        conn.rollback()
    engine.dispose()
except Exception as exc:
    raise SystemExit('Read-only preflight failed: ' + type(exc).__name__)
'@ | .venv/Scripts/python.exe -
    if ($LASTEXITCODE -ne 0) { throw 'Target guard failed; stop.' }
}
Assert-TutorMEDevTarget
```

Empty/unversioned databases intentionally fail the guard; full-history bootstrapping is a separate approval scope. Do not stamp to bypass it.

### C. Development migration - only if pending, approval required

If the guard reports e47b901ad682, **skip migration**. For an approved target at 81099c270fbc or c21a76e9d304:

```powershell
Assert-TutorMEDevTarget
.venv/Scripts/python.exe -m alembic upgrade e47b901ad682
if ($LASTEXITCODE -ne 0) { throw 'Migration failed; inspect before proceeding.' }
.venv/Scripts/python.exe -m alembic current
```

Approval covers only reviewed pending revisions on that dev branch. No downgrade, stamp, reset, direct SQL replay, seed or production operation is included. Verify schema/counts/constraints read-only afterward. The original inspected branch already requires no migration.

### D. Independent catalog import - separate dataset/target approval

Review the official inputs, vintage, provenance and paths first. Run only approved types:

```powershell
Assert-TutorMEDevTarget
.venv/Scripts/python.exe -m scripts.import_service_areas `
  'C:/data/2025_Gaz_place_national.txt' --kind place --year 2025
if ($LASTEXITCODE -ne 0) { throw 'Places import failed; stop.' }
Assert-TutorMEDevTarget
.venv/Scripts/python.exe -m scripts.import_service_areas `
  'C:/data/2025_Gaz_zcta_national.txt' --kind zcta --year 2025
if ($LASTEXITCODE -ne 0) { throw 'ZCTA import failed; stop.' }
```

These are proposed input paths, not files verified to exist. Recount source/year/country groups afterward. No seed command or legacy-profile UPDATE is proposed: classification requires a separate per-ID owner decision.

### E. Disposable PostgreSQL concurrency test - schema write/drop approval

Use a branch explicitly approved as disposable for this test, not merely approved for inspection. If different, supply its direct URL and branch ID in step A and rerun the guard. Prefer strengthening the test's own identity/time-bound safeguards in a separately approved code change first.

```powershell
Assert-TutorMEDevTarget
$env:TUTORME_TEST_DATABASE_URL = $env:DATABASE_URL
$env:TUTORME_TEST_DATABASE_IS_DISPOSABLE = '1'
$env:PGOPTIONS = '-c lock_timeout=10s -c statement_timeout=30s'
try {
  .venv/Scripts/python.exe -m unittest discover -s tests `
    -p test_postgres_booking_concurrency.py -v
  if ($LASTEXITCODE -ne 0) { throw 'Concurrency test failed; review cleanup.' }
} finally {
  Remove-Item Env:TUTORME_TEST_DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:TUTORME_TEST_DATABASE_IS_DISPOSABLE -ErrorAction SilentlyContinue
}
# Inspect test-schema cleanup read-only. Close this temporary shell afterward.
```

This creates/inserts/drops a random test schema with CASCADE. Expected results: one 200 and one 409. Process-local feature patches do not enable the running app. Keep test variables out of backend .env. The target guard does not replace explicit disposable-environment approval.

### Excluded operations

No app booking enablement, policy reapproval, production writes, account deletion/modification, seed invocation, automatic demo labeling, or real signup against the inspected Auth branch is proposed. Development API/browser scenarios that create identities, acknowledgments, appointments or deletion requests need a separately approved target and mutation scope. Signup may send provider verification emails.

## 11. Prioritized API/browser acceptance checklist

### P0 - environment and read-only checks
- [ ] Confirm Console names/IDs, default/protected status and source/dev environment purpose.
- [ ] Running flags remain ready=true, bookingsEnabled=false, minorProfilesEnabled=false.
- [ ] Dev schema/revision/constraints match; its Auth/JWKS belong to that branch; no production credentials reused.
- [ ] Public Terms/Privacy cross-links, contact and Google legal links render. Pages alone do not establish compliance.
- [ ] Public tutor payloads exclude private email/auth IDs/acknowledgments and fabricated verification/availability.
- [ ] Resolve owner classification of profile/user pairs 5/11, 6/12, 7/14, 8/15 without automatic edits.

### P1 - approved isolated PostgreSQL/location tests
- [ ] Run actual race test; inspect enum/table isolation and cleanup. Validate Alembic separately.
- [ ] Verify approved catalog provenance/counts and exact city/state/ZIP resolution; empty, unsupported and ambiguous selections.
- [ ] Assign dev tutor subjects explicitly; test subject/price/mode and both-radii matching.
- [ ] Distinguish Google API failure from empty catalog; no per-keystroke custom /areas?q= calls.
- [ ] Desktop/mobile/light/dark/zoom/keyboard: native attribution and full predictions visible; no clipping, filtering or logo replacement. List View does not instantiate Dynamic Maps.

### P1 - approved dev Auth/privacy mutations
- [ ] Reject missing/false/nonboolean adult acknowledgment, stale/absent Terms, admin signup and identity mismatch.
- [ ] Trace adult student/tutor through proxy, provider, session/JWT and app user; version/time/purpose recorded correctly.
- [ ] Exercise verification-required/no-immediate-JWT and app-user creation failure/retry; correct incomplete-registration recovery.
- [ ] Audit direct-provider signup only using controlled approved identities; account for provider emails. CORS/email verification do not establish adulthood.
- [ ] Existing users sign in and expressly acknowledge eligibility; guardian accounts cannot create child profiles/minor bookings.
- [ ] Own deletion request is idempotent, outsiders denied; define processed/rejected semantics before manual processing.

### P2 - genuine booking, after separate DEV-ONLY enablement approval
- [ ] Demo slots/create/confirm blocked server-side; labels on card/profile/map.
- [ ] One-hour online/in-person requests, half-hour boundaries, future/30-day limits, zones/offsets and DST gaps/folds.
- [ ] Tutor-only accept/decline; outsider denial; future cancellation and ended confirmed completion.
- [ ] Idempotency retries/mismatches, alternate modes, pending duplicates/cap, concurrent requests.
- [ ] Recheck availability/conflicts on confirmation; actual PostgreSQL tutor overlap and student conflicts across tutors.
- [ ] Participant-only meeting URL/approved venue details; no public residence, fake link, checkout or real test-booking email.
- [ ] Accurate pending/confirmed status/history; deletion statuses follow the chosen lifecycle policy.

## 12. Conclusion

The next step on the configured DB is **not another migration**. Review environment purpose/disposable target, catalog import scope, legacy provenance, provider/recovery issues and PostgreSQL concurrency. All proposed write commands await review. This audit stops here: booking remains disabled and no database-changing operation ran.

### Official references
- [Neon connection pooling and administrative connections](https://neon.com/docs/connect/connection-pooling)
- [Neon authentication flow and default signup behavior](https://neon.com/docs/auth/authentication-flow)
- [Neon email verification](https://neon.com/docs/auth/guides/email-verification)
