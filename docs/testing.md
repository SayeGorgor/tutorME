# Testing, responsive design and reliability

Separate isolated tests, PostgreSQL races, static browser fixtures and hosted end-to-end acceptance. Historical totals are dated evidence; this documentation change did not rerun application suites or live workflows.

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
