# TutorME pre-production merge and deployment readiness audit

November 6, 2026 — America/New_York

**Recommendation: Ready to merge with conditions.** Source checks pass, but the booking work is already on the only visible Git branch, `master`. There is no distinct development-to-production merge to perform. Production hosting/branch mapping, production database identity/schema and deployed environment settings remain unverified. This report does not approve deployment or real booking enablement.

## 1. Scope and current Git state

Inspected local source/configuration, sanitized local environment metadata, Git history/status/refs, and GitHub branch heads using read-only `git ls-remote`. Ran isolated checks and a synthetic production build. No production database connection or hosted application request was made. No merge, fetch, staging, commit, push, deployment, migration, branch mutation, live test, account creation or environment-file edit was performed. Only this report was added; generated ignored build/test files may change.

The repository changed while the first audit turn was interrupted. Earlier findings of 35 uncommitted files are superseded by the refreshed state below; the agent did not make that commit or push.

| Item | Verified result |
| --- | --- |
| Current/local branch | `master` — the only local branch |
| Remote | `origin`, GitHub repository `SayeGorgor/tutorME` |
| Remote branches | Only `refs/heads/master`, independently checked on GitHub |
| HEAD / local master / origin/master / GitHub master | `fcf33ecf42ef34dafadf80248bfeb4c1a4a3588f` |
| Commit | `added booking capabilities` |
| Previous baseline | `13fbf9dc60835f1d5fe030ad2b65c0c9b999d4cd` |
| Local vs cached remote unique commits | `0 / 0` |
| Merge base master ↔ origin/master | `fcf33ecf42ef34dafadf80248bfeb4c1a4a3588f` |
| Initial refreshed working tree | Clean, no staged or untracked source files |
| Working tree after this report | This report is the only intended new untracked file |
| Development Git branch | No separately named branch exists in the visible repository |
| Production Git branch | Hosting mapping is not available; `master` is the only candidate, not proof of production deployment |
| Distinct-branch conflicts / production-only commits | Not assessable without another verified production ref; none exist between the two identical master refs |

The dev Neon branch is not a Git branch. Do not infer a production Git branch from a Neon display name or treat the historical Neon branch ID as current production identity. If hosting auto-deploys master, this commit **may already have triggered deployment**; inspect hosting release history before initiating another release.

## 2. Release change inventory

Commit `fcf33ec` changes **35 files**, 1,413 additions and 181 deletions relative to `13fbf9d`. This is the identifiable release delta; older registration/legal/geographic implementation is already in the baseline and should not be described as newly entering through this commit.

| Category | Changes in this commit |
| --- | --- |
| Snapshot schema/API | New f83 migration; Booking model and request/response fields; exact Decimal quotes; tutor-assigned subject validation; stale-rate conflicts; subject/rate-sensitive idempotency; nullable history |
| Booking correctness | Derived pending expiry/count limits; participant eligibility recheck; deletion-aware slots; extreme time-zone slot coverage; profile lock for rate/subject edits |
| Booking interface | Shared BookingDetails/BookingNotice; subject and quote review; stored details in sessions/dashboard; clearer status feedback |
| Authentication transport | JWT shape rejection/sanitized logs; shared token acquisition/fallback; protected user/profile/availability/location calls use the common authorized helper |
| Navigation/UI | Signed-in account/dashboard links and logo routing; more visible student Explore tutors action |
| Configuration/test safety | Hide settings inputs in validation errors; filter six known test-only dotenv keys; exclude established dev branch from destructive test; preserve three races and strengthen fixture/snapshot assertions |
| Tests/docs | New authorization, booking readiness, quote and frontend regressions; booking snapshot and dev readiness reports |

No unrelated credential files or obvious temporary source artifacts were found in this delta. Navigation/dashboard cosmetics are intentional prior user requests but can be reviewed as a separate concern if the release owner wants a narrower release. Documentation is historical evidence, not current production state; earlier reports that migrations/catalogs were absent must not override new operator verification. Payments pages explicitly describe the absence of payment processing, not an implemented checkout. No new moderation, scheduling worker or payment feature is present.

## 3. Source verification

| Check | Result |
| --- | --- |
| Backend isolated discovery, repeated against committed checkout | **125 passed, 3 live PostgreSQL tests skipped**; 128 total |
| Snapshot/migration regressions | Included: 11 tests, PostgreSQL offline additive SQL and single-head checks |
| Auth/authorization, expiry, overlap, modes and time-zone regressions | Included in passing isolated suite |
| Frontend Node tests, repeated against committed checkout | **42 passed** |
| TypeScript noEmit | Passed |
| ESLint | Zero errors, eight existing unused-variable warnings in tutor profile page |
| Next.js production build | Passed with synthetic API/Auth/Google settings and network access for existing Google Fonts |
| Import/startup smoke | Passed with engine.connect patched to reject any DB connection; root, health, policies, OpenAPI, unsigned /users/me and configured CORS tested |
| Alembic source head | Single head `f83d2a19b506` |
| Whitespace validation | `git diff --check` passed |

The build artifact used synthetic settings and **must not be deployed**; rebuild in the actual production environment after reviewing its variables. Transient process overrides were used only for isolation; no saved environment configuration changed. Backend discovery used sqlite:// and synthetic Auth/location settings, with live test opt-in absent from process environment. Normal isolated tests do not load the live-test dotenv settings into the concurrency test.

Startup smoke emitted two nonfatal warnings: Starlette's httpx test-client deprecation and an OpenAPI nonserializable default on the existing /users/me declaration. The endpoint still returned 401 without a token. These are follow-up items, not evidence of production outage.

The operator reports all three updated live PostgreSQL races and controlled booking/snapshot acceptance passed. They were not rerun or independently observed here. SQLite tests and offline DDL do not establish production locking or applied schema correctness. Dependency installation from a fresh hosting image, vulnerability scanning, hosted JWT claims, email delivery and real browser viewport testing were not independently repeated.

## 4. Secrets and local environment safety

No `.env` file is tracked. Root/frontend ignores cover `.env*`, virtual environments, node_modules, build output, caches and TypeScript build info. Reachable Git history contains no environment-named files. Pattern scanning of tracked/untracked text found only synthetic test credentials/keys; no genuine secret candidate was identified. This limited scan is not proof that all historical commits are secret-free, and it does not replace host secret review.

Local files currently point to development:

| Setting | Sanitized observation |
| --- | --- |
| Backend DB | psycopg URL, pooled `ep-lucky-resonance-ax8nmonu-pooler.c-4.us-east-2.aws.neon.tech`, database neondb, TLS parameter present |
| Backend/frontend Auth | Matching `ep-lucky-resonance-ax8nmonu.neonauth.c-4.us-east-2.aws.neon.tech`; database path neondb/auth |
| JWKS | Same Auth host and neondb/auth path |
| Intended dev project/branch | Operator context: still-math-23486169 / br-odd-cake-axy2uqro; not freshly verified through SQL here |
| Frontend API | `http://localhost:8000` — development only |
| BOOKING flag | `BOOKINGS_ENABLED=false` locally and false in application default |
| Policies | Local approval true; operator/contact present; effective date 2026-11-05; source Terms version 2026-11-05-v1 |
| Minor profiles | Policy endpoint hardcodes false; guardian/minor booking restrictions remain |
| Browser Google settings | Key and map ID present; these are public browser configuration, not private server secrets |
| Auth cookie secret | Present; never printed |
| Live test configuration | All six TUTORME test values are present in ignored backend .env, including both opt-ins set to 1 and a disposable URL; no test variables inherited in the inspected process |

**Do not copy local env files into hosting.** The ignored backend file contains disposable-test credentials. Its test URL currently uses the default postgresql scheme, whereas the current guard requires postgresql+psycopg; a future approved rerun must correct its private process URL. The test configuration is not a production deployment configuration. Do not move it to production or treat its IDs as production IDs. It was not edited.

Required backend production configuration: DATABASE_URL using installed psycopg/TLS, NEON_AUTH_BASE_URL, NEON_AUTH_JWKS_URL, CSC_LOCATION_API_KEY and CSC_API_URL (still required by Settings), plus reviewed legal operator/contact/date/approval and explicit BOOKING flag false. GOOGLE_MAPS_API_KEY is an optional legacy server setting. Do not alter policy approval as part of rollout.

Required frontend production configuration: NEXT_PUBLIC_API_URL (actual HTTPS backend), server-only NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET, public NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and NEXT_PUBLIC_GOOGLE_MAP_ID. Never place DB URLs, test URLs or cookie secrets in NEXT_PUBLIC variables. Google key API/referrer restrictions, billing and map ownership require Console verification. Browser API origin is compiled at build time; changing host settings after build alone does not fix that bundle.

No hosting secret store, Auth management UI, trusted-origin list or callback allowlist was accessible. The app does not define a separate server trusted-origin list or explicit signup callbackURL; it relies on provider configuration and its existing OTP/session flow. Localhost allowance or old audit findings do not establish current production correctness. Confirm the exact production frontend origin in Neon Auth; backend CORS is a separate control.

## 5. Migration compatibility and read-only verification

Source chain:

```text
b292ed7c70dc -> 589c8535b65d -> 8a25eae11095 -> 856c251d9a79
-> 9d45a3cef40a -> b3879da82696 -> 202a56c8dc07 -> 9d1c25417d93
-> 8d02a9a967bc -> 81099c270fbc -> c21a76e9d304 -> e47b901ad682
-> f83d2a19b506
```

The new revision adds six nullable columns and four checks with no backfill/default/drop/reconstruction. Subject ID is historical, without a live cascading FK. Old ORM code can read/update its known columns against this additive schema. Old inserts omit snapshots and can still create NULL history if allowed; therefore keep **all old/new backend instances** booking-disabled throughout rollout. The new backend needs the six columns even with booking disabled, because session-history queries load them.

No dev or production DB was contacted. Applied revision is **unverified**, not assumed pending. In an independently selected production connection, the operator can run the following read-only transaction. Record Console project/branch/database identity independently before comparison; do not reuse dev or historical production IDs by assumption.

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '3s';
SHOW transaction_read_only;
SELECT current_setting('neon.project_id', true) AS project_id,
       current_setting('neon.branch_id', true) AS branch_id,
       current_database() AS database_name;
SELECT version_num FROM public.alembic_version;
SELECT column_name, data_type, is_nullable, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'bookings'
  AND column_name IN ('subject_id','subject_name_snapshot',
    'hourly_rate_snapshot','currency_snapshot',
    'duration_minutes_snapshot','session_amount_snapshot')
ORDER BY column_name;
SELECT conname, convalidated, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.bookings'::regclass AND contype = 'c'
  AND conname IN ('booking_nonnegative_quote','booking_quote_currency',
                 'booking_quote_duration','booking_quote_amount')
ORDER BY conname;
SELECT count(*) AS booking_count FROM public.bookings;
SELECT source, country, count(*) FROM public.service_areas
GROUP BY source, country ORDER BY source, country;
SELECT count(*) AS tutor_subject_associations FROM public.tutor_subjects;
ROLLBACK;
```

Expected six column types: bigint, varchar(255), numeric(12,2), varchar(3), smallint and numeric(12,2), all nullable. Expected checks: nonnegative rate/amount, USD, duration=60, amount=rate, each validated. Compare full definitions, not only names. Record booking count before/after deployment without exporting customer rows. Catalog/association availability is unverified; old reports' empty counts are not current facts.

| Actual result | Required decision |
| --- | --- |
| f83d2a19b506 plus expected columns/validated checks | **Already applied. Do not rerun migration.** |
| f83 but columns/checks differ | Schema drift; stop, investigate; do not stamp or replay DDL |
| e47b901ad682 with intact expected prior schema | A separate reviewed migration approval is needed before new backend rollout |
| Older, unknown, unversioned or multiple revisions | Stop for separate chain/data-preservation review |

Do not run a blanket upgrade head, old exported SQL, downgrade, stamp, reset or Neon branch merge/restore. Older chain hazards documented in prior audits remain relevant only if those older revisions are actually pending.

## 6. Hosting and deployment contract

Actual hosting platforms and production branch mapping are **not established by repository evidence**. No Vercel project link/config, Render/Railway manifest, Dockerfile, Procfile, runtime pin or CI workflow was found. The README is a Next template; the Vercel SVG is not deployment evidence. Hardcoded CORS permits `https://tutorme2.vercel.app` and localhost:3000; this suggests a frontend URL but does not prove the active platform, domain or production branch. The backend hostname is unknown.

Confirm hosting service/project, production Git ref, deployed SHA, root directories, commands, runtime, auto-deploy status and secret scopes in hosting Console. Since fcf33ec is already remote, check whether deployment occurred before attempting another one.

| Component | Source-supported contract, not verified host settings |
| --- | --- |
| Frontend | Root frontend; npm ci using package-lock.json; npm run build; managed Next runtime or npm run start; server execution required for Auth/policy routes, not static export |
| Backend | Root backend; python -m pip install -r requirements.txt; ASGI app app.main:app; production uvicorn bind 0.0.0.0 and platform port, without --reload |
| Runtime | Local checks used Node v26.13.0 and Python 3.14.3; installed Next engines require Node >=20.9.0. Host runtimes are unpinned/unverified; select supported host versions and validate installation/parity before release |
| Dependencies | Frontend lockfile present; backend requirements pin versions; no separate Python resolver lock or host runtime manifest |
| Routing | NEXT_PUBLIC_API_URL directly targets backend; no Next API rewrite for FastAPI. /api/auth remains the frontend server proxy |
| Backend startup | Imports settings/router; creates lazy SQLAlchemy engine; no startup migration, create_all, seed, scheduler or background worker found |
| Pooling | Local application URL uses Neon pooler plus SQLAlchemy's default pool; production target/pool limits unverified. Budget total connections across workers/instances; use reviewed direct admin connection for schema work |
| Health | /api/health/ and root are shallow liveness checks, not DB/Auth readiness |
| Logging | INFO stdout; expected invalid-token failures sanitized; no configured central error/metrics/alerting service visible. SQLAlchemy engine does not globally hide parameters |

### Version order

1. Verify actual production settings, release SHA and schema first. Confirm bookings false on every running instance and preserve policy approval.
2. If schema is already f83 with expected structure, **skip migration**. Otherwise stop for separately approved schema work before releasing this backend.
3. Deploy the reviewed backend SHA and verify health/OpenAPI/policies with bookings false. Wait for every instance to converge.
4. Rebuild/deploy the matching frontend with correct production build-time API/Google configuration and server Auth secrets/origin. Verify host/CORS/Auth alignment.
5. Observe read-only smoke tests and logs; handle any stale CDN/service instances. Booking enablement is a later explicit release decision.

New frontend -> old backend: the old request schema ignores subjectId/expectedHourlyRate, risking bookings without snapshots if the old flag is enabled. Old frontend -> new backend: missing required fields fail 422. Keeping bookings false and deploying backend first prevents silent quote loss; even disabled deployments can show a transient 422 to an old client's attempted POST, without creating a booking. Do not enable until all versions converge. Feature flags are process-loaded, so changing hosting values needs the relevant restart/redeploy.

## 7. Security and operational findings

### Conditions before deploying even with bookings disabled

1. **Production identity/hosting unknown:** establish actual service/ref/SHA, DB project/branch/name, schema and Auth alignment. If master auto-deploys, inspect the release already triggered by fcf33ec.
2. **Production env not inspected:** verify no localhost API, dev DB/Auth endpoint, disposable credentials or TUTORME flags in production scopes; keep bookings explicitly false. Ensure the actual public origin matches CORS and Auth origins. A different domain currently needs a separately reviewed CORS correction.
3. **Schema precondition:** new history queries require snapshot columns despite booking gate false. Follow the read-only decision table; no automatic migration.
4. **Immutable release evidence:** pin fcf33ec or the reviewed merge result, rebuild with production values and test the final hosting runtime/dependency install. Do not publish the synthetic audit artifact.

### Conditions before enabling bookings for real users

1. Verify hosted adult/Terms/email claims and legacy-account eligibility using separately approved controlled identities. New completion requires a signed strictly verified email and provider-bound name; **get_current_user does not recheck email verification for an existing app user**, and booking adult() checks acknowledgments rather than current emailVerified. Establish the existing-account policy before claiming universal verified-email enforcement.
2. Direct hosted-provider signup bypasses the Next acknowledgment/duplicate precheck and can create an Auth-only identity; backend completion remains protected. Review provider-directory privacy/eligibility collection and duplicate/signup-email behavior. Actual production provider settings were not inspected.
3. Review production catalog/subject/availability readiness and demo provenance. Demo create/slots/confirmation is blocked, but a genuine legacy profile is not automatically fictional or verified. No tutor approval/publishing or moderation queue exists; newly registered profiles can be publicly browsable even before useful completion. Decide acceptable launch/moderation controls.
4. Establish abuse controls. Source limits future pending requests to 20 per student and paginates history, but no application-wide HTTP rate limit was found for signup eligibility, auth proxies, public slots/search or custom subjects. Duplicate-check responses permit account enumeration; confirm an appropriate protection/privacy decision. Provider/edge limits are unknown.
5. Verify actual production constraints and operator-reported race evidence against the released version; use only a separately approved disposable target for new races. Application row locks protect cooperating endpoints, not arbitrary direct SQL writes; no exclusion constraint exists.
6. Confirm support, incident response, retention/deletion handling and meeting privacy. Participant-only history/meeting data and owner edits are enforced server-side; public areas are coarse independent Census points. Deletion requests do not erase data automatically; closed requests require support, no operator processing endpoint or automated retention exists. Do not claim full deletion automation.
7. Controlled production acceptance, email/session writes and real booking flag enablement need explicit later authorization. No customer appointment should be created by this audit.

### Follow-up hardening / acknowledged limits

- Backend owns authorization: self-managed adult student creation, tutor-only acceptance/decline/completion, participant-only cancel/history/meeting details, owner-only profile/availability edits, demo and guardian restrictions. Passing tests cover these paths. Frontend protected layout checks session existence, not strict role routing; API enforcement must remain authoritative.
- Snapshot immutability applies to normal application writes, not privileged SQL. Profile Float remains for compatibility; quote conversion validates exact cents and uses Decimal. Historical subject IDs may outlive catalog records by design.
- JWT signature/issuer/audience/sub and expiration-if-present are validated. Presence of exp is not explicitly required in PyJWT options; review stricter required claims and JWKS failure handling without bypassing provider verification.
- Health does not test dependencies; add operational DB/Auth readiness evidence and alerting. Public docs/OpenAPI use FastAPI defaults; decide exposure policy. Avoid logging connection strings, tokens, SQL parameters or private meeting information in hosted error traces.
- Clear the existing eight lint warnings, OpenAPI default warning and test-client deprecation in focused follow-up changes. Measure catalog query plans/connection budgets after import. No dependency security audit was performed.
- Payments, booking emails, automatic expiry workers, variable-duration appointments, atomic rescheduling, calendar sync and new meeting providers remain absent by design; no release claim should imply them.

## 8. Proposed Git commands — review only, NOT executed

### Current topology: no merge or push is needed

These commands refer to the actual master branch and tested commit. This report will be untracked; account for it rather than stashing/discarding changes automatically.

```powershell
Set-Location 'C:/Users/Pokef/Projects/tutorME'
$TestedCommit = 'fcf33ecf42ef34dafadf80248bfeb4c1a4a3588f'
git status --short
git diff --check
git rev-parse HEAD
git ls-remote --heads origin

# Future reference update only after reviewing/authorizing it:
git fetch origin
if ($LASTEXITCODE -ne 0) { throw 'Fetch failed; stop.' }
git branch -avv
git merge-base master origin/master
git rev-list --left-right --count origin/master...master
git log --left-right --oneline origin/master...master
git diff --stat origin/master...master
git diff --stat 13fbf9dc60835f1d5fe030ad2b65c0c9b999d4cd $TestedCommit
git diff --name-status 13fbf9dc60835f1d5fe030ad2b65c0c9b999d4cd $TestedCommit
```

At inspected state, the divergence/diff between master refs is empty: work is already published to GitHub. Do not create a fake no-op merge or reset production to development. Verify the host deploys master before treating that ref as production. The report can be reviewed/committed separately; no git add/commit was executed by this audit.

### Only if a different production branch is subsequently established

No such branch currently exists in the visible repository, so naming one here as actual production would be fabrication. This conditional workflow uses an operator-verified existing remote branch, preserves its production-only commits, and leaves original checkout changes untouched. Review/approve each block; do not execute it merely to create another environment.

```powershell
$ProductionBranch = Read-Host 'Exact existing production Git branch verified in hosting Console'
git show-ref --verify "refs/remotes/origin/$ProductionBranch"
if ($LASTEXITCODE -ne 0) { throw 'Production ref absent; stop and investigate.' }
git merge-base "origin/$ProductionBranch" $TestedCommit
git log --left-right --oneline "origin/$ProductionBranch...$TestedCommit"
git diff --stat "origin/$ProductionBranch...$TestedCommit"
git diff --check "origin/$ProductionBranch...$TestedCommit"
git merge-base --is-ancestor $TestedCommit "origin/$ProductionBranch"
if ($LASTEXITCODE -eq 0) { throw 'Production already contains this commit; no merge needed.' }
if ($LASTEXITCODE -ne 1) { throw 'Ancestry check failed; stop.' }
```

For a genuinely pending integration, only after approval (proposed names, not existing branch identities):

```powershell
$ReviewWorktree = 'C:/Users/Pokef/Projects/tutorME-production-review'
if (Test-Path -LiteralPath $ReviewWorktree) { throw 'Review path already exists; preserve it.' }
git worktree add -b review/booking-production $ReviewWorktree "origin/$ProductionBranch"
if ($LASTEXITCODE -ne 0) { throw 'Worktree creation failed.' }
git -C $ReviewWorktree merge --no-ff --no-commit $TestedCommit
if ($LASTEXITCODE -ne 0) { throw 'Resolve/review conflicts in the review worktree; do not commit or push yet.' }
git -C $ReviewWorktree diff --name-only --diff-filter=U
git -C $ReviewWorktree diff --cached --stat
git -C $ReviewWorktree diff --check
```

Manually reconcile conflicted files against both branches, preserving production-only behavior. Stage only reviewed resolutions. Install dependencies and rerun all isolated backend/frontend checks in that merge worktree with synthetic settings and no PostgreSQL test opt-in. Do not use customer data or inherit the configured test URL. Record the resulting merge tree and checks.

Only after successful checks and review:

```powershell
git -C $ReviewWorktree commit -m "Merge reviewed booking snapshots for production"
if ($LASTEXITCODE -ne 0) { throw 'Commit failed; stop.' }
git -C $ReviewWorktree rev-parse HEAD
# Separate publication approval; can trigger CI/preview deployment:
git -C $ReviewWorktree push -u origin review/booking-production
```

Open an auditable GitHub PR from review/booking-production to the verified production branch, recording tested source/merge SHAs, migration state, checks, flag-off rollout and rollback plan. Approve production merge separately and rerun checks if the base advances. No force push, production reset or discard of production-only commits is recommended. In the actual current master-only state this conditional workflow is unnecessary.

## 9. Production smoke checklist — future, read-only unless separately authorized

- Confirm host deployment SHA/root/runtime and independently verified DB/Auth identity; no development endpoint or disposable credentials in host scopes or public bundle. Do not print those secrets to prove absence.
- Root and /api/health/ respond; inspect sanitized startup/error logs. Health alone is insufficient for database readiness.
- GET /api/policies: expected operator/contact/Terms, ready state, **bookingsEnabled=false**, minorProfilesEnabled=false. Preserve publication approval; do not toggle it to test failure.
- Homepage, mobile/desktop navigation, tutor browsing, subject filters, profile rates and Google/Census location selection render. Geography/API reads can incur external API usage; do not save profiles or import data during a read-only check.
- Terms/Privacy and contact links load. Registration/login/verification pages load without submitting forms. Confirm exact Auth/CORS origins using approved Console inspection or unauthenticated requests.
- Unauthenticated GET /api/users/me and /api/bookings reject; no private meeting data appears on public tutor responses. Never copy tokens into reports or network exports.
- Existing session history and quote snapshots render for a separately approved controlled signed-in account, including nullable legacy fallback. Sign-in can write provider sessions/send mail and is **not** part of an unauthenticated read-only smoke test.
- Controlled registration, OTP delivery, interrupted completion, eligibility and booking mutations remain deferred until explicit production test authorization. Use synthetic adult identities; no genuine tutoring appointments/customer modifications.
- Review all backend instances and frontend artifact versions; no old API remains in rotation before any separate booking release.

## 10. Rollback and approval gates

First keep bookings false across all instances and suspend further release actions. Restore a reviewed known-good backend/frontend artifact pair using the host's normal release rollback after approval. Rebuild with its correct production environment if necessary; do not deploy the synthetic audit artifact. Keep the additive f83 schema and all stored quotes. An older app can omit fields in output without erasing columns, but must not be allowed to create snapshot-less bookings.

If a Git-level rollback is needed, prepare a PR with `git revert fcf33ecf42ef34dafadf80248bfeb4c1a4a3588f` on a new review branch from the then-current verified production ref, inspect conflicts and rerun checks. fcf33ec is an ordinary commit; a future merge revert instead requires separately selecting/reviewing the parent. Never reset/force-push production or downgrade/drop the snapshot columns. Reverting this commit also removes the source migration file; that creates source-vs-applied history divergence, so prefer an approved forward corrective commit/artifact rollback and preserve revision history before another Alembic action. Do not run migration tooling from a reverted tree missing the applied revision.

Explicit operator decisions still required:

1. Identify actual hosting services, production ref/release SHA and independently verified Neon production identity; inspect possible automatic deployment already triggered by remote master.
2. Review production secrets/origins/CORS/runtime and establish schema state through approved read-only access. No live production DB connection was made here.
3. Approve any genuinely required merge/ref publication and hosting deployment. Current refs need no additional merge or push.
4. If production is already f83 with expected schema, mark migration **already applied** and do nothing. Any pending migration/drift correction needs its own reviewed approval, backup and change window.
5. Approve controlled production Auth/email/session tests, if wanted. Real booking enablement and customer-facing acceptance is a separate later decision after the booking-release conditions above.
6. Approve any rollback or cleanup explicitly; no destructive SQL/Neon operation is proposed.

**Ready to merge with conditions:** the committed source passes isolated validation and is already on the only remote branch. No additional merge should be attempted without establishing a distinct production target. Production deployment remains conditional on environment/schema/hosting verification, and bookings must remain disabled.
