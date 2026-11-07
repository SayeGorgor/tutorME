# Booking subject and immutable quote snapshots

November 6, 2026

Implemented in source only. No live database connection, migration, account mutation, seed, booking operation or feature-flag edit ran. `BOOKINGS_ENABLED` still defaults to false and environment files were not changed. The three live PostgreSQL scenarios and manual end-to-end test described in the request are operator-reported historical results, not results rerun for this change.

## Architecture audit and assumptions

Reviewed Booking/TutorProfile/Subject models, tutor_subjects, creation/confirmation/serialization, schemas, tutor PATCH, availability/conflicts, BookingRequest, BookingList, both session pages and compact dashboard callers, migration history and isolated/live test fixtures before implementation.

Existing bookings contained participants, format, start/end, status, idempotency key and private meeting details; no subject or pricing fields existed. Tutor profile price is Float; registration supplies $20/hour. Existing appointments are exactly one hour with half-hour start boundaries. The interface uses dollars; no multicurrency booking configuration/conversion exists. New snapshots explicitly use USD and 60 minutes. No payments or variable durations are introduced.

The assumptions stated before implementation were: historical values cannot be inferred from today's profile; new requests need a currently assigned subject; stale rates require explicit refresh; confirmation accepts the original quote. Legacy requests remain confirmable under existing safety checks without inventing details.

Existing participant locks are sorted user rows followed by the tutor profile. Confirmed overlaps cover either participant across modes/tutors. Pending requests do not reserve time; expiry is derived. Existing eligibility, demo, deletion, feature gates, time-zone/DST, cancellation and privacy rules remain authoritative.

## Snapshot representation

All six columns are nullable with no defaults or historical backfill:

| Column | Type / new-booking value |
| --- | --- |
| subject_id | BigInteger, historical selected ID |
| subject_name_snapshot | String(255), original selected name |
| hourly_rate_snapshot | Numeric(12,2), exact decimal |
| currency_snapshot | String(3), USD |
| duration_minutes_snapshot | SmallInteger, 60 |
| session_amount_snapshot | Numeric(12,2), rate times 60/60 using Decimal |

`subject_id` deliberately has **no live foreign key**. It is a historical identifier, independently validated at creation. A SET NULL FK would erase part of the original request identity and break identical retries after subject deletion. Names remain available without a catalog join; deleting a subject cannot delete history. Consumers must not assume this historical ID still resolves to a current subject.

Checks enforce nonnegative money, USD, 60 minutes and equal rate/amount for this fixed-hour model. NULL semantics preserve legacy records. New creation requires complete snapshots through application validation. There is no snapshot update endpoint. Profile edits, confirmation, cancellation, declining, completion, meeting updates and serialization never recalculate these fields. Privileged arbitrary SQL is outside this guarantee; no immutability trigger was added.

Response decimals serialize as strings, e.g. `"25.10"`. Frontend formatting does no floating-point pricing arithmetic. Missing historical subject, rate, duration and amount display **Not recorded**, including after legacy confirmation.

## Validation, pricing and idempotency

New POST `/api/bookings` requires `subjectId` and `expectedHourlyRate` alongside tutorId, mode, startsAt and idempotencyKey. Send expectedHourlyRate as a decimal string, e.g. `"25.10"`.

The expected rate is a compare-only acknowledgement, never the source of the price. After existing authorization/eligibility checks, the server reads the locked profile and assigned subject, constructs Decimal from the stored rate's decimal text, validates exact cents and the existing 0–10000 range, and saves its own quote with the booking. Extra client price/total/currency/duration fields reject. No silent rounding occurs. Profile updates now reject fractional-cent and explicit-null rates. Existing invalid/fractional-cent rates require a tutor edit; the Float profile column is retained for compatibility.

- Changed initial rate: 409 QUOTE_CHANGED, no booking. Refresh details and review before submission.
- Unassigned/deleted subject: 409 SUBJECT_UNAVAILABLE, no booking. Refresh and select an offered subject.
- Exact idempotent retry: original booking and quote, even after rate edits, subject renaming, unassignment or physical deletion. Other account/feature/mode safety checks still apply.
- Same key with changed tutor, mode, start, subject or expected rate: 409.
- Same student/tutor/start and a new key: reuse the pending request only if format, subject and quote match; otherwise conflict with review/cancel instructions.
- Confirmation honors the stored quote after profile edits. Tutors may decline rather than rewrite the quote.

## Concurrency and interface

The original user-to-profile lock order is unchanged. Rate/subject PATCH now locks the same profile row before edits, serializing normal edits with snapshot capture. Membership is queried fresh after that lock; the selected Subject is share-locked through capture. Quote fields commit with the booking. No participant lock reversal was introduced.

All three opt-in live PostgreSQL scenarios retain their original race/status/count/rollback assertions and identity safeguards. Fixtures now assign a synthetic subject and acknowledge the rate, with additional snapshot assertions. The established development branch remains forbidden by that disposable-test guard. These tests use create_all rather than Alembic and were **not executed**.

BookingRequest now requires an offered subject, retains selection across date/time/format changes, explains no-subject/invalid-rate states, and reviews tutor, subject, format, local date/time/time zone, duration, rate and total. Stale quotes disable submission until explicit refresh; refresh keeps still-valid subjects. Wording explains direct payment arrangements without collection by TutorME.

Both participants' session pages and compact dashboard/history views share stored-snapshot presentation. Pending uses **Requested session / Quoted rate**; confirmed/completed uses **Confirmed session / Accepted rate**. Other statuses preserve recorded quoted details without asserting payment or acceptance.

## Files changed for this task

- backend/app/models/booking.py
- backend/app/schemas/booking.py
- backend/app/services/bookings.py
- backend/app/schemas/tutor.py
- backend/app/routes/tutors.py
- backend/alembic/versions/f83d2a19b506_booking_detail_snapshots.py
- backend/tests/test_marketplace.py — opt-in synthetic booking subject fixture
- backend/tests/test_postgres_booking_concurrency.py — fixtures and additional assertions
- backend/tests/test_booking_snapshots.py
- frontend/components/BookingRequest.tsx
- frontend/components/BookingList.tsx
- frontend/components/BookingDetails.tsx
- frontend/lib/booking-details.ts
- frontend/lib/types.ts
- frontend/tests/booking-details.mjs
- docs/booking-detail-snapshots.md

Pre-existing working-tree changes were retained.

## Validation

- Backend discovery: **125 passed, 3 live PostgreSQL tests skipped** (128 total).
- New backend coverage: **11 passed**, including additive PostgreSQL offline SQL generation and linear migration-head verification.
- Frontend Node tests: **42 passed**, including six new quote/component regressions.
- TypeScript noEmit and final Next.js production build: passed. Initial sandbox build could not download existing Google Fonts; retry with network access succeeded.
- ESLint: zero errors, eight pre-existing unused-variable warnings in the tutor profile page.
- `git diff --check`: passed.

Backend regressions cover assigned/unassigned/missing subjects, missing expected rate, injected pricing/duration fields, stale quotes, exact cents/zero rates, invalid legacy fractional cents, profile edits, subject rename/deletion, original-quote retries and payload conflicts, all status transitions and legacy NULLs. Existing eligibility, authorization, feature-flag, DST, overlap and cross-mode tests also pass. Frontend checks execute the actual selector and summary, preserve choices across date/format/time changes, verify compare-only payloads, stale-quote blocking, no-subject behavior, pending/accepted wording, original snapshot rendering, missing-data fallbacks and loading/error recovery. Responsive grid classes/static markup are checked; actual viewport/keyboard acceptance is still manual.

Coverage uses synthetic in-memory SQLite/API tests, PostgreSQL offline SQL generation, controlled hooks/network and React static rendering. No configured database was contacted. These checks do not prove live PostgreSQL locking or real browser layout. Safe backend discovery overrides DATABASE_URL with sqlite:// and synthetic Auth/location settings and removes TUTORME_RUN_POSTGRES_TESTS. Commands used were `python -m unittest discover -s tests`, `node --experimental-strip-types --test tests/*.mjs`, `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/eslint/bin/eslint.js .` and `node node_modules/next/dist/bin/next build`, from their respective backend/frontend directories.

## Development migration procedure — NOT executed

New linear revision: **e47b901ad682 → f83d2a19b506**. Adds six nullable columns and four checks; no updates, defaults, table reconstruction, extension or backfill. ALTER TABLE/check validation can acquire locks and scan bookings. Downgrade deliberately refuses automatic removal of historical quotes.

Apply schema before restarting the updated backend and paired frontend. New booking clients must send the two required fields; historical responses are additive/nullable. Stop dev writers during the migration and review backup/restore capability. Older, unversioned or unexpected revisions require separate review; do not stamp or replay historical SQL.

The intended target is project `still-math-23486169`, branch `br-odd-cake-axy2uqro`, database `neondb`. This is context, not authorization. After approval, use a temporary PowerShell session and privately supply the reviewed **direct TLS psycopg URL**:

```powershell
Set-Location 'C:/Users/Pokef/Projects/tutorME/backend'
$taskSecureUrl = Read-Host 'Approved dev direct psycopg URL with TLS' -AsSecureString
$env:DATABASE_URL = [System.Net.NetworkCredential]::new('', $taskSecureUrl).Password
$env:PGOPTIONS = '-c lock_timeout=5s -c statement_timeout=60s'
```

In a private trusted SQL client using that exact target, verify read-only:

```sql
BEGIN READ ONLY;
SHOW transaction_read_only;
SELECT current_setting('neon.project_id', true),
       current_setting('neon.branch_id', true), current_database();
SELECT version_num FROM public.alembic_version;
SELECT count(*) FROM public.bookings;
ROLLBACK;
```

Require the exact three identifiers above and revision e47b901ad682. If already f83d2a19b506, skip the migration; otherwise stop on any discrepancy. Confirm that the temporary process URL is the same direct endpoint, uses postgresql+psycopg and explicit sslmode=require/verify-ca/verify-full. Do not change URLs/endpoints between verification and execution or print credentials.

Only after specific migration approval and successful verification:

```powershell
.venv/Scripts/python.exe -m alembic upgrade f83d2a19b506
if ($LASTEXITCODE -ne 0) { throw 'Migration failed; stop and inspect.' }
.venv/Scripts/python.exe -m alembic current
```

Verify branch identity/revision again read-only, six columns and four constraints, unchanged booking count/participants/status/times and NULL legacy snapshots. Close the temporary session afterward. Default booking remains false. Do not downgrade/drop quotes to roll back application code; preserve history and review a forward fix or explicitly approved restore. No migration or actual target-state check ran here.

## Controlled manual acceptance — separate live-operation approval

1. Confirm approved dev identity, migrated schema, Auth alignment and actual feature flag. Use controlled adult verified tutor/student identities, never legacy-account edits or seeds.
2. Through existing tutor UI/API assign two subjects, set $25.10/hour and future availability; these profile writes need approval.
3. With booking off verify request rejection. Only after separate temporary dev booking enablement approval, select subject/date/time/mode and review the quote. Missing/no subjects must prevent submission.
4. In another controlled browser change rate to $35 before submission. Expect conflict/no booking, refresh and review. Repeat with subject removal.
5. Create a new $25.10 pending request, then edit rate/subjects. Both participants must still see original subject, 60 minutes and $25.10. Confirm the original quote. Test exact retries and changed-subject/key conflicts through controlled API calls.
6. Cancel/decline/complete appropriate synthetic sessions and inspect history and legacy Not recorded values. Verify outsiders cannot see private records.
7. Run the three PostgreSQL races only after approving a separate disposable branch and all six existing guard variables; never use the established dev branch. Inspect generated-schema cleanup and snapshots. Migration correctness needs separate validation because the races use create_all.
8. Check desktop/mobile, light/dark, zoom, keyboard, labels, loading/errors, refreshed modes, time zones/DST and summaries. Static tests do not replace browser acceptance.
9. Restore any separately authorized dev booking flag to false and restart/verify. Cleanup, identities, provider settings, minor restrictions and operations on another branch are not authorized here.

Remaining limits: Float profile storage is retained but new quotes use validated exact cents; no SQL immutability trigger; historical IDs intentionally outlive catalog rows; live migration, new races and browser acceptance remain unexecuted. Existing decline/cancel plus a new request remains the way to change an agreed quote or appointment.
