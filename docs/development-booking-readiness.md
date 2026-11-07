# TutorME development booking readiness

November 6, 2026 — America/New_York

**Existing booking components are ready for controlled development acceptance testing after operator approval. They have not been verified end-to-end against live Neon. Booking remains disabled. The established development branch is now explicitly excluded from destructive PostgreSQL tests.**

This report supersedes earlier source-readiness notes about pending expiry, test dotenv handling and disposable-target eligibility. Earlier live database findings remain historical snapshots.

## 1. Scope and current configuration

Performed source review, sanitized configuration reads, isolated backend/frontend tests, lint, TypeScript, production build and source-only `alembic heads`. No live PostgreSQL connection, HTTP booking operation, signup, email delivery, migration, seed command, account update, Auth configuration change or feature-flag edit was performed. Existing seed regression tests operate only on synthetic in-memory fixtures.

| Item | Finding |
| --- | --- |
| Intended dev target supplied by operator | Project `still-math-23486169`, branch `br-odd-cake-axy2uqro`, DB `neondb` |
| Configured application DB | psycopg, `neondb`, host `ep-lucky-resonance-ax8nmonu-pooler.c-4.us-east-2.aws.neon.tech` |
| Actual server identity/revision | Not re-queried in this pass; verify read-only before future mutations |
| Source migration head | `e47b901ad682`, one head; this change adds no migration |
| Effective application booking flag | `bookings_enabled=false` |
| Policies | `LEGAL_PUBLICATION_APPROVED=true`, computed ready=true, unchanged |
| Minor profiles/bookings | Disabled; no changes |
| Test configuration | Six test keys exist in backend dotenv, but no process-level test opt-in was present |
| Disposable approval | No live target approved or verified in this pass; dotenv contents are not approval |

Application settings previously rejected the test-only dotenv keys and prevented backend startup. They now ignore **only** the six recognized test keys, retaining validation of unrelated unknown keys. Test opt-ins remain process-only; the app never treats them as booking flags or loads them into the live-test process environment. Validation messages now suppress input values. Environment files were left untouched.

The earlier audit's server revision and catalog counts are historical. This pass does not infer current catalog contents, subject assignments, account eligibility, or server flags from those counts or a running server that may predate configuration changes.

## 2. Architecture and capability inventory

| Area | Implemented behavior and practical limit |
| --- | --- |
| Feature gate | `/api/policies` computes `bookingsEnabled` from published/valid policies **and** backend `BOOKINGS_ENABLED`. Slots, new requests and confirmation enforce it server-side. History and future cancellation remain available when disabled. |
| Availability | Tutor-owned PUT `/api/tutors/{profile_id}/availability` replaces the complete schedule. Weekly Sunday=0 through Saturday=6; custom local dates; half-hour minute boundaries; valid IANA zones. A bookable hour must fit one continuous availability row; separate adjacent rows are not merged by the booking service. |
| Subjects | Tutor-owned PATCH `/api/tutors/user/{user_id}` with `subjectIds` replaces associations. Tutor-only POST `/api/subjects/` can add/reuse custom subjects. Subjects filter discovery; the booking record itself does not store a selected subject. |
| Discovery/location | Google selection resolves to independent area IDs. Online/in-person settings and travel-radius filters drive discovery. In-person booking requires the tutor's in-person mode and service area, but does not itself geofence the student or automatically assign a venue. |
| Slot lookup | Public GET `/api/bookings/slots/{profile_id}?day=...&mode=...&timezone=...`; future one-hour slots on half-hour boundaries, up to 30 days; demo/ineligible/deleting tutors blocked. Tutor confirmed overlaps are excluded in either mode. Student-specific conflicts are checked on authenticated submit/confirm, not this public lookup. |
| Requests | Authenticated self-managed adult student POST `/api/bookings`. UUID-like idempotency key; identical retries return the original record; changed payload conflicts. Same student/tutor/start pending format change conflicts explicitly. At most 20 future pending requests per student. |
| Pending and expiry | Pending requests are approval requests, **not slot holds**. Several students may request the same time. They expire at the start instant, not after a 15-minute TTL. Expiry is a derived API/UI status; stored status remains pending under the existing constraint. No expiry job or database rewrite was added. Expired requests do not consume the active-pending cap. |
| Confirmation | Tutor-only POST `/api/bookings/{id}/status` action=confirm. Locks participant user rows in a shared order, then the tutor profile, refreshes data, rechecks eligibility/deletion, mode, current availability and confirmed overlaps. |
| Conflicts | Half-open intervals: existing start < requested end and existing end > requested start. Any confirmed overlap with the tutor **or student**, across formats/tutors, rejects. Back-to-back appointments are allowed; no travel buffer. Protection is application locking, not a database exclusion constraint against arbitrary SQL writers. |
| Cancellation / completion | Either participant may cancel a future pending/confirmed appointment. Tutor may decline a future pending request or mark an ended confirmed appointment completed. Outsiders see 404; students cannot confirm/decline/complete. Retrying the same transition is idempotent. |
| Rescheduling | No atomic reschedule operation or dedicated reschedule UI. The supported workaround is cancel then request another time; it does not preserve the original slot. |
| Meeting details | Tutor-only edit on confirmed appointments. Online requires an HTTPS URL without embedded credentials. In-person requires explicit public-venue confirmation. Details returned only to participants while confirmed; no automatic meeting service or booking email. |
| History/dashboards | `BookingRequest` on public tutor profile; `BookingList` on `/student/sessions` and `/tutor/sessions`, plus compact dashboard cards. History paginates, includes status/action/private-detail controls. Refresh after changes in another browser; no realtime subscription/polling. Compact cards show five records ordered by start descending, not a dedicated nearest-upcoming query. |
| Authentication | Existing Neon session/JWT → app user → role/purpose/adult/current-Terms checks. A guardian cannot make minor bookings. Demo restrictions remain independent of the global flag. No new Auth configuration or weakened verification was introduced. |
| Time zones | Availability uses each row's IANA zone; request timestamps require offsets; storage/comparison is UTC. UI displays the device zone. Ambiguous/nonexistent DST endpoints are omitted; duration is one elapsed hour. Viewer/availability date conversion now handles extreme UTC offsets correctly. |

An endpoint's presence is not live acceptance evidence. In particular, hosted Auth claims/session cookies, deployed origins, actual PostgreSQL locking and real browser/API coordination remain untested in this pass.

## 3. Exact supported test-account setup

All account/profile operations below await approval of controlled synthetic accounts and the intended dev target. Do not reuse or modify legacy/genuine accounts. Keep the database branch isolated from production and review any copied account/Auth data. Controlled email aliases must belong to the tester; `.invalid` cannot test email delivery.

### Tutor T1

1. Open the dev frontend `/signup/tutor`. Enter the tutor's synthetic name, controlled email and password; explicitly confirm adult eligibility and current Terms. Signup creates a provider identity and may send verification mail.
2. Complete `/verify-email` using the provider's supported method, then `/login`. In the same browser within seven days, the encrypted registration receipt retains the original name/type/purpose and setup completes automatically. Without it, provide only missing account choices/current acknowledgment. Names come from the verified identity; do not replace them during completion.
3. Confirm the account is a tutor at `/tutor/profile`. Normal new tutor profiles are `is_demo=false`, online=true, in-person=false, default $20/hr, with no subjects or availability. Do not relabel a demo to bypass booking restrictions.
4. Add intro/about text and optionally edit the hourly rate. Under **Subjects you teach**, select existing subjects, or Add subject and then **Save subjects**. The profile badges must reflect only saved choices.
5. Under **How and where you teach**, save lesson modes. For in-person, select the Google city/ZIP, resolve its independent catalog ID, select radius/allowed public meeting preference and expressly consent to public area display. Online-only needs no area. An unavailable catalog must be resolved through separately approved data preparation, not by saving Google coordinates.
6. Configure availability as below and save it. Confirm the preview and public profile show the expected modes, area, subjects and rate.
7. In `/account/settings`, ensure adult purpose=tutor and current Terms acknowledgment exist. No active deletion request. No separate tutor approval/publishing workflow exists: profiles are public without a moderator publish step; appointment acceptance is the booked tutor's decision, not platform vetting.

Record the returned **user ID** and distinct **tutor profile ID** from normal authenticated responses/UI. Subjects/location use the user ID; availability/slots/booking creation use profile ID.

### Student S1 (and S2 for competing requests)

Register at `/signup`, choose **Myself (adult student)**, expressly accept eligibility/Terms, verify the controlled email and log in. Confirm app purpose=self, adult/current-Terms records and no active deletion request. Use S2 only for the approved competing-request scenario. Do not use guardian/child accounts for successful booking tests. A second controlled tutor T2 is needed for a browser test of student conflicts across different tutors.

## 4. Availability and profile API examples

Prefer the existing tutor UI. For authenticated API acceptance tests, use the signed-in browser's normal request mechanism; do not paste tokens or credentials into reports or shell history. These examples are payload templates, **not executed requests**.

Assign subjects via PATCH `/api/tutors/user/<OWN_USER_ID>`:

```json
{"subjectIds": [123]}
```

Choose actual existing IDs from GET `/api/subjects/`; `123` is illustrative. For a missing subject, tutor-only POST `/api/subjects/` with `{"name":"Music theory"}`, then select/save its returned ID. Both operations write data; creation alone does not add a teaching badge.

Create Monday 10:00–12:00 in New York via PUT `/api/tutors/<OWN_PROFILE_ID>/availability`:

```json
{"availability":[{"type":"weekly","dayOfTheWeek":1,"startTime":600,"endTime":720,"timezone":"America/New_York"}]}
```

Alternatively, use a future custom date in that availability zone:

```json
{"availability":[{"type":"custom","date":"<FUTURE_LOCAL_YYYY-MM-DD>","startTime":600,"endTime":720,"timezone":"America/New_York"}]}
```

PUT replaces the complete schedule, including omitted rows. Never run it on another tutor's account. Choose a future Monday/date within 30 days, request slots with the student's device zone, and copy an exact returned ISO timestamp rather than assuming a UTC offset.

Location preferences use PUT `/api/tutors/user/<OWN_USER_ID>/location`:

```json
{"onlineEnabled":true,"inPersonEnabled":true,"serviceAreaId":"<RESOLVED_CENSUS_ID>","travelRadiusMiles":25,"meetingPreferences":"Public libraries","publicAreaConsent":true}
```

No residential address is required. IDs, not display names, persist the independent geographic match.

## 5. Enabling booking in development — not done

`backend/app/core/config.py` reads `BOOKINGS_ENABLED` from process environment or backend `.env`; the default is false. `app/services/policies.py` also requires approved, valid policy settings. There is no separate frontend booking flag.

Before approval, verify the intended project/branch/database, current schema and flags read-only. In a trusted SQL client:

```sql
BEGIN READ ONLY;
SHOW transaction_read_only;
SHOW default_transaction_isolation;
SELECT current_setting('neon.project_id',true),
       current_setting('neon.branch_id',true), current_database();
SELECT version_num FROM public.alembic_version;
SELECT count(*) FROM public.service_areas;
SELECT count(*) FROM public.subjects;
ROLLBACK;
```

The locking workflow assumes normal PostgreSQL READ COMMITTED operation; investigate a different configured isolation level before testing. No current live isolation value was inspected. If identity/schema differs, stop; do not migrate/stamp/reset automatically.

After explicit **dev-only enablement approval**, in a temporary backend PowerShell session connected to the reviewed dev settings:

```powershell
Set-Location 'C:/Users/Pokef/Projects/tutorME/backend'
$env:BOOKINGS_ENABLED = 'true'
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Stop an older server on that port normally first. This process override does not edit `.env` or enable a deployed production backend. Alternatively the operator can edit **only the dev deployment's** flag and restart it. Leave `LEGAL_PUBLICATION_APPROVED` and minor restrictions unchanged. Check the running dev `/api/policies` returns ready=true/bookingsEnabled=true; reload the frontend to refresh its loaded policy state. After testing, stop the enabled process, remove the override or set it false, restart and verify bookingsEnabled=false. No enablement command above ran here.

## 6. Disposable PostgreSQL test and safety

`backend/tests/test_postgres_booking_concurrency.py` now defines three live scenarios:

1. Two students submit competing online requests to one tutor, then race confirmations.
2. Online and in-person requests compete for the same tutor/time.
3. One student submits across two tutors/formats, then those tutors race confirmation.

Workers synchronize before request submission and again before confirmation. Each expects successful pending creation, exactly one confirmation=200 and one conflict=409. The loser rolls back, probes a usable fresh transaction and rolls back again. The parent asserts exactly two booking rows, one confirmed and one still pending. Thus no extra confirmed record or partially changed loser is accepted by the test. These are service-level operations with mapped HTTP status codes, not an HTTP/Auth/browser integration test.

**All three live tests remain unexecuted.** This source review does not prove actual PostgreSQL isolation, enum placement, cleanup, or production locking.

### Required process variables

| Variable | Required value/source |
| --- | --- |
| `TUTORME_RUN_POSTGRES_TESTS` | `1`, explicit live-test opt-in |
| `TUTORME_TEST_DATABASE_IS_DISPOSABLE` | `1`, explicit approval of fixture/schema writes and CASCADE cleanup |
| `TUTORME_TEST_DATABASE_URL` | Privately supplied direct TLS psycopg URL for the approved disposable branch |
| `TUTORME_TEST_PROJECT_ID` | Independently reviewed Console project ID |
| `TUTORME_TEST_BRANCH_ID` | Independently reviewed disposable branch ID |
| `TUTORME_TEST_DATABASE_NAME` | Reviewed database name, verified by current_database() |

Both established branches are now denied even if flags are set: `br-royal-bird-ax5hkimq` and **`br-odd-cake-axy2uqro`**. Their known endpoint IDs are denied too. Actual server identity is checked in a verified read-only transaction before creating the schema, on each worker and before cleanup. An unrelated hostname cannot bypass actual-branch checks. Only a separately approved disposable branch is eligible. The six dotenv keys are ignored by application Settings and are not automatically exported for testing.

The operator must review branch source/copied-data scope, role privileges, compute cost and expiration in Console. Do not create or reset a branch automatically. A full clone can contain genuine accounts/Auth data even though the fixture schema is separate.

### Exact proposed commands after separate approval

Use a new temporary PowerShell session. Set expected identifiers from the independently reviewed target, not from an arbitrary URL. This placeholder branch intentionally cannot be run unchanged:

```powershell
Set-Location 'C:/Users/Pokef/Projects/tutorME/backend'
$taskSecureTestUrl = Read-Host 'Approved DISPOSABLE direct PostgreSQL URL' -AsSecureString
$env:TUTORME_TEST_DATABASE_URL = ([System.Net.NetworkCredential]::new('', $taskSecureTestUrl).Password) -replace '^postgres(?:ql)?://', 'postgresql+psycopg://'
$env:TUTORME_TEST_PROJECT_ID = 'still-math-23486169'
$env:TUTORME_TEST_BRANCH_ID = '<SEPARATELY_APPROVED_DISPOSABLE_BRANCH_ID>'
$env:TUTORME_TEST_DATABASE_NAME = 'neondb'
$env:TUTORME_RUN_POSTGRES_TESTS = '1'
$env:TUTORME_TEST_DATABASE_IS_DISPOSABLE = '1'
```

First run this **read-only** guard and review the printed nonsecret identifiers:

```powershell
@'
import os, sys
sys.path.insert(0, 'tests')
from postgres_test_guard import approved_target, test_engine, verify_connection
engine = None
try:
    target = approved_target(os.environ)
    engine = test_engine(target)
    with engine.connect() as conn:
        verify_connection(conn, target)
    print('Verified disposable target:', target.project, target.branch, target.database)
except Exception as exc:
    print('Read-only target verification failed:', type(exc).__name__)
    raise SystemExit(1)
finally:
    if engine is not None:
        engine.dispose()
'@ | .venv/Scripts/python.exe -
if ($LASTEXITCODE -ne 0) { throw 'Target verification failed; stop.' }
```

Only after target verification **and explicit destructive-test approval**:

```powershell
try {
  .venv/Scripts/python.exe -m unittest discover -s tests -p test_postgres_booking_concurrency.py -v
  if ($LASTEXITCODE -ne 0) { throw 'Race test failed; inspect results and cleanup before retrying.' }
} finally {
  Remove-Item Env:TUTORME_RUN_POSTGRES_TESTS -ErrorAction SilentlyContinue
  Remove-Item Env:TUTORME_TEST_DATABASE_IS_DISPOSABLE -ErrorAction SilentlyContinue
  Remove-Item Env:TUTORME_TEST_DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:TUTORME_TEST_PROJECT_ID -ErrorAction SilentlyContinue
  Remove-Item Env:TUTORME_TEST_BRANCH_ID -ErrorAction SilentlyContinue
  Remove-Item Env:TUTORME_TEST_DATABASE_NAME -ErrorAction SilentlyContinue
}
```

Each scenario creates a new random `tutorme_test_<uuid>` schema, ORM tables/enums and synthetic users, tutors, area, schedules and requests, updates booking statuses, then drops only that generated schema with CASCADE. Workers temporarily enable policy/booking settings in their own process; the running app remains disabled.

Existing limits remain: connect=5s, lock=5s, statement/idle-transaction=15s, barrier=5s and shared worker deadline=30s. Cleanup stops workers first and rechecks identity. Connection failure can prevent cleanup, and a cleanup exception can obscure the original error; inspect leftover generated schemas read-only. Any manual DROP requires separate target/schema approval. `create_all` is not a migration test, and application row locks do not prevent arbitrary SQL overlap inserts. Close the temporary session afterward.

## 7. Ordered browser/API acceptance checklist

All mutations below await controlled dev-account/write-scope approval. Signing in also writes provider session state; signup/verification can send provider email. No genuine appointment or real customer account is part of this plan.

1. **Read-only preflight:** verify dev identity/revision, effective false booking flag, valid policy metadata, current independent catalog, subjects and correct DB/Auth/JWKS alignment. Confirm actual runtime settings after restart. Check disposable approval separately; the established dev branch cannot run the race test.
2. **Accounts:** create/verify/login T1, S1 and optionally S2/T2 through existing UI. Check original names/type retained, missing setup recovery, explicit current acknowledgment and guardian restrictions. Identity/app-user writes and provider mail require approval.
3. **T1 setup:** assign subjects, save a clear intro, choose rate and formats. For in-person, select an independent city/state or ZIP and public-area consent. Save one continuous availability row of at least an hour in its stated IANA zone. These are profile/association/schedule writes on synthetic accounts only.
4. **Disabled behavior:** slots, create and confirm reject while false; existing participant history/cancellation remain available. No demo slot/request/confirmation bypass. Prepare any demo fixture separately; do not seed or relabel legacy tutors.
5. **Disposable race gate:** after separate target/write approval, execute all three live scenarios and inspect cleanup. Do not interpret SQLite passes as a PostgreSQL pass. Do not perform a destructive race on the established dev branch.
6. **Dev-only flag:** after approval, enable only the reviewed dev backend and confirm its public policy response. Keep production and minor settings unchanged.
7. **Student request:** S1 opens T1's public profile, chooses format/date in device zone, checks times and submits one returned timestamp. Pending status must be clear. Repeating the same key/payload returns the same record; changing its payload or requesting a different pending format at that time conflicts. A second student's pending request should not be mistaken for a reserved slot. Booking writes require approval.
8. **Tutor management:** T1 sees the request at `/tutor/sessions`, accepts it, and enters controlled private HTTPS meeting details or an explicitly approved public venue. Reload S1 `/student/sessions`: confirmed state and private details appear. S2/outsiders cannot view/change them; students cannot accept/decline/complete. No booking email or payment is expected.
9. **Conflicts/rechecks:** confirmed online appointments exclude in-person overlaps and vice versa. Test the same student's conflict across T1/T2, half-hour overlap, exact retry and back-to-back boundary. Revoke availability before another confirmation: reject rather than accepting a stale slot. Compare viewer/availability zones including DST and extreme date offsets. These mutate synthetic booking/schedule data only.
10. **Lifecycle:** cancel a future pending/confirmed appointment as either participant; refresh the other browser and confirm history/private-detail behavior. Decline future pending; only the tutor can complete an ended confirmed fixture. Pending at/past its start displays expired and cannot confirm; it no longer uses the active-pending cap. Do not alter real timestamps to simulate this—use isolated tests or separately approved synthetic fixture preparation.
11. **Finish safely:** stop the temporarily enabled dev process, restore false, verify the running flag, inspect records read-only and preserve nonsecret pass/fail evidence. No automatic identity deletion, account cleanup, catalog import or migration. Reschedule, if tested, is explicitly cancel/new request with no slot guarantee.

## 8. Corrections and validation results

Focused corrections made:

- Ignore only known test-only dotenv keys in app Settings and hide input values in validation messages; no env edits or automatic test opt-in.
- Explicitly deny the established dev branch/endpoint in configured **and actual-server** test guards.
- Extend the unexecuted live test to concurrent request creation/confirmation, cross-mode and cross-tutor student conflicts, exact persisted-state checks and a rollback transaction probe.
- Derive expired pending status in API/UI and exclude expired requests from the 20-active-request cap, without DDL or historical row updates.
- Refresh participant eligibility after acquiring locks and recheck student deletion/eligibility inside the protected workflow. Hide slots for a tutor with active deletion review.
- Derive availability dates from viewer/row zones rather than assuming ±1 calendar day; fixes missing slots across extreme offsets.
- Disable booking input changes during a pending request, prevent rapid repeated submissions and release the pending UI state in `finally`, preserving retry/idempotency semantics.

| Check | Result |
| --- | --- |
| Baseline isolated backend suite before corrections | 97 passed, 1 live test skipped (98 total) |
| Final isolated backend suite | **111 passed, 3 live PostgreSQL tests skipped** (114 total) |
| Frontend Node suite | **31 passed**, including expiry display tests and prior Auth/location regressions |
| Full frontend ESLint | 0 errors; 8 existing unused-variable warnings in tutor profile |
| TypeScript noEmit / Next production build | Passed |
| Source Alembic head | `e47b901ad682`; no upgrade/current/stamp executed |
| Live PostgreSQL / browser booking | **Not executed** |

Backend tests explicitly used synthetic SQLite configuration and removed the process live-test opt-in. Focused regressions cover pending/no-hold behavior, expiry boundary/cap/history, cross-mode and cross-tutor overlaps, cancellation while disabled, revoked availability, demo blocks, deleting tutors, weekly IANA conversion, extreme viewer offsets, dev-branch guards and safe Settings validation. Existing tests cover idempotency, role/participant access, DST gaps/folds, private details and minors/Terms gates. Fixture clocks/times are synthetic; no hosted signup or booking transaction ran.

Changed files: `backend/app/core/config.py`, `backend/app/services/bookings.py`, `backend/app/routes/sessions.py`, `backend/tests/postgres_test_guard.py`, `backend/tests/test_postgres_booking_concurrency.py`, new `backend/tests/test_booking_readiness.py`, `frontend/lib/types.ts`, new `frontend/lib/booking-status.ts`, `frontend/components/BookingRequest.tsx`, `frontend/components/BookingList.tsx`, new `frontend/tests/booking-status.mjs`, and this report.

## 9. Remaining blockers and separate approval boundaries

Before live dev acceptance: verify actual dev/disposable identities and schema, approve controlled account creation/mail/profile changes, run the approved disposable PostgreSQL tests, and explicitly approve temporary dev booking enablement and booking mutations. Existing dotenv test connection details are not sufficient authorization. The configured development branch remains non-disposable.

Production issues intentionally remain unresolved here: database-level overlap guarantees against arbitrary writers; actual load/deadlock/isolation behavior; platform tutor vetting/publication policy; booking-rate/subject snapshots and price agreement (current rates are informational, no payments); atomic rescheduling/travel buffers; realtime notifications/operational delivery; durable pending-expiry workflow if a pre-start TTL is required; monitoring, retention and manual deletion processing. No production enablement, Auth setting, minor restriction, payment integration, destructive cleanup or migration is approved by this report.

**Stop point:** source corrections and isolated validation are complete. Booking remains false. All disposable-schema tests and live account/appointment operations wait for the operator's reviewed target and mutation approval.
