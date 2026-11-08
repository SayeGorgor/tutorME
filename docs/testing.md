# Testing, responsive design and reliability

## Automated CI implementation

The [workflow](../.github/workflows/ci.yml) defines three independent Ubuntu jobs on push, pull request and manual dispatch: frontend checks, backend isolated checks, and PostgreSQL migrated integration. It uses Node 26 LTS and Python 3.14, synthetic settings and no repository secrets. See the [implementation report](ci-implementation-2026-11-08.md) for current local results and remaining blocked checks. The workflow has not yet executed on GitHub.

From `backend`, after installing `requirements.txt` into a virtual environment, run `python -m scripts.run_isolated_tests`. This entrypoint replaces application settings with synthetic values before discovery, disables the Neon live-test opt-in and reports the exact three expected skips; unexpected skips fail. The complete suite includes synthetic JWT signature/claim/JWKS tests, role/ownership API regressions and independent container-guard rejection tests. `python -m pip check` and `python -m compileall -q app scripts tests integration alembic` provide dependency consistency and syntax checks, not a full Python lint audit. Offline Alembic SQL generation requires a synthetic PostgreSQL dialect URL; use the workflow's exact environment/commands, never an inherited hosted URL for online migration checks.

From `frontend`, use `npm ci`, `node --experimental-strip-types --test tests/*.mjs`, `npx --no-install tsc --noEmit`, `npm run lint` and `npm run build`. On Windows, use `npm.cmd`/`npx.cmd` if PowerShell blocks wrappers. Production build fetches the existing Google Fonts; use approved HTTPS connectivity without TLS bypasses or font mocks. Synthetic Auth URL/cookie-secret settings permit compilation without supplying production credentials; complete page generation still needs validation in the first successful build.

### Separate container integration path

`python -m integration.run_container` is an explicit CI-only entrypoint, outside ordinary test discovery. The workflow provisions PostgreSQL 17.6 as a fresh service with synthetic credentials, a random mapped port, and no external volume. A Docker-exec bootstrap marks only that service's database with the current workflow run/attempt. The independent guard accepts only the fixed loopback host, fixed synthetic database/user and validated run/port fields, then checks database/user/comment identity read-only and requires an empty database before migrations. It never reads `DATABASE_URL` as a test target and never changes or invokes the Neon guard.

Real Alembic upgrades run on the already verified connection via `Config.attributes['connection']`. The Alembic entrypoint independently requires the explicit CI opt-in, exact service URL and read-only identity/emptiness checks before accepting a supplied connection. Ordinary CLI behavior without a supplied connection is preserved and regression-tested. Revision matching and Alembic metadata comparison run against the migrated database. No `create_all`, stamping, drift allowlist or fallback schema is used. Five required tests cover schema compatibility, three confirmation races and service-level wrong-role/cross-account booking access plus valid participant actions. Database constraints and session rollback operate on PostgreSQL; this is separate from HTTP/JWT validation in the isolated suite. All five must execute with zero skips for success. The schema comparison covers Alembic's supported type/nullable/index/constraint comparison, not proof of every enum value, check expression or server default.

Each integration fixture uses unique synthetic users, tutors, areas and subjects. Guard checks precede migrations, fixtures and worker use; connect/statement/lock/idle-transaction/barrier/future and job timeouts bound execution. Fixture rows remain only in the disposable service; no database/schema drop is issued. GitHub owns service teardown after job completion/failure/cancellation. Do not point this harness at an existing local or hosted database, tunnel a hosted target to its port, or manually copy the marker onto established data. Opt-ins/markers are operational safeguards, not protection from arbitrary malicious workflow code; use only ephemeral hosted runners without production access.

No local Docker/PostgreSQL runtime was available for this implementation. The container job is unverified until it runs on GitHub. Its failure must remain visible; migration/schema incompatibility must be investigated rather than skipped. Hosted OAuth, mail, provider key rotation/session behavior and Neon-specific TLS/identity remain manual staging checks. Existing Neon race tests and exclusions below remain unchanged.

Separate isolated tests, PostgreSQL races, static browser fixtures and hosted end-to-end acceptance. Historical totals below are dated evidence; the CI implementation report records the latest local rerun separately from live workflows.

## Isolated checks

[Backend tests](../backend/tests/) cover identity/verification, recovery, ownership/policies, deletion, availability/DST, conflicts/idempotency, snapshots, naming and guarded imports. Most use synthetic SQLite. Keep live opt-ins absent and use synthetic configuration; never inherit a production URL just to discover tests.

Frontend [Node tests](../frontend/tests/) exercise proxy/form retries, receipts, location loading, quotes, expiry and responsive controls. From frontend, `node --experimental-strip-types --test tests/*.mjs`, TypeScript `--noEmit`, ESLint and `npm run build` are separate checks. Review build configuration/network needs; compilation is not hosted workflow acceptance.

## Disposable PostgreSQL tests

The [race suite](../backend/tests/test_postgres_booking_concurrency.py) and [guard](../backend/tests/postgres_test_guard.py) require six process variables: `TUTORME_RUN_POSTGRES_TESTS`, `TUTORME_TEST_DATABASE_IS_DISPOSABLE`, `TUTORME_TEST_DATABASE_URL`, `TUTORME_TEST_PROJECT_ID`, `TUTORME_TEST_BRANCH_ID`, `TUTORME_TEST_DATABASE_NAME`. Both opt-ins equal `1`; direct psycopg connections need explicit TLS. Established targets are excluded; do not remove guards or copy actual exclusion IDs into public commands.

Actual server identity is verified read-only before schema creation and by workers/cleanup. Unique schemas contain synthetic participants/availability/bookings. Scenarios race submissions/confirmation across formats/tutors and assert persisted state/rollback. Five-second connect/lock/barrier, fifteen-second statement/idle-transaction and thirty-second shared worker bounds limit hangs. Stop workers before dropping only the generated schema; inspect leftovers privately if cleanup fails.

These tests create/drop objects and need explicit disposable-target/write approval. A URL/ID plus flags does not prove purpose authorization. ORM `create_all` does not validate Alembic or arbitrary SQL writers. No live test ran for consolidation.

## Responsive design and fixtures

Zero-minimum flex/grid children, wrapping, intrinsic spacing and contained calendar scrolling prevent overflow without global `overflow-x:hidden`. Native date/select controls, editor calendar boundaries, quote grids, menus, active filters and footer/legal links retain narrow-layout access. Motion/themes need their own visual checks.

The [responsive harness](../frontend/scripts/responsive-audit.mjs) renders actual components with controlled hooks/services into static HTML, applies built CSS and uses Arial fallback. It is not hydrated Next.js end-to-end testing. Provider/API hosts are blocked and intentionally long synthetic names/subjects/future dates stress layout. All nine retained screenshots were visually reviewed and match the fixture source; no visible customer data, credentials or private endpoints were found. Encoding artifacts are visual defects, not secrets.

Historical matrices cover 19 fixtures, both themes, widths 320-1920 including intermediate 900/1100, short landscape and 200% root text. They do not establish native browser zoom, real fonts, physical devices, screen readers or Google widget behavior. `--quick` overwrites final output; `--before` needs a matching baseline CSS build. Do not rerun the harness merely to check Markdown.

Retain the editor before/after pair plus numerical context before retiring other screenshots. [Original responsive evidence](responsive-design-audit.md) remains intact. Widget attribution/predictions, hydration/focus restoration and authenticated booking require separate controlled acceptance.

## Security and release evidence

Use an established local scanner with redacted reports for tracked current content and available history. Review candidates; do not allowlist whole test directories. Dependency advisories, provider settings and live races remain separate validation. Old operational snapshots neither establish current vulnerabilities nor prove readiness. See [deployment](deployment.md).
