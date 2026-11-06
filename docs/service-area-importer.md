# Census service-area importer

November 6, 2026

The old importer issued one primary-key lookup per row, potentially flushed pending ORM inserts during lookups, and committed the entire file only at the end. Network round trips to Neon dominated the work; other transactions could not see uncommitted progress.

The updated importer streams the same Census records into batches (default 1,000, configurable 1–5,000). Each batch uses one PostgreSQL multi-row `INSERT ... ON CONFLICT (id) DO NOTHING RETURNING id`, with the existing `service_areas.id` primary key as conflict target. Existing records are never overwritten. Counting returned IDs gives actual inserted/skipped totals, including duplicates within a batch. No per-row database queries, ORM autoflush, or per-row commits remain.

Each batch commits independently. Startup, verified target, each committed batch, completion and failure messages flush immediately. Counts are cumulative: `read` includes valid parsed records in the pending/failed batch; `inserted` and `skipped` count only successfully committed batches. Empty/header-only files complete with zero records. Bad headers, malformed records, invalid coordinates/field lengths and database failures stop the import rather than silently dropping data. Errors include parsing line or batch context without driver SQL, parameters or credentials.

## Source changes and verification

- `backend/scripts/import_service_areas.py`: streaming/bulk import, explicit target guard, independent transactions and progress. Existing model, schema, year range, IDs, coordinate bounds, place/ZCTA provenance, pipe/tab and UTF-8 BOM support retained. Configuration/engine loading is lazy so help and parser tests need no application database.
- `backend/tests/test_service_area_importer.py`: isolated bulk-insert, duplicate/idempotency, PostgreSQL SQL compilation, rollback/resume/cancellation, target mismatch, parsing, empty-file and flushed-progress tests.
- This guide: invocation, verification and recovery procedures. Older reports' importer commands omit the new required identity arguments and are historical; use the commands below.

Tests use real in-memory SQLite transactions for insert/rollback behavior, mocked Neon identity queries, and PostgreSQL dialect compilation. They do not establish live Neon performance or server behavior. No configured database connection, migration, seed, import or other live write is performed for validation. The existing backend suite also runs its seed regression only on synthetic in-memory fixtures.

Validation result: all **15 importer tests pass**. Full isolated backend discovery: **69 tests pass, 1 live PostgreSQL test skipped** (70 total). `git diff --check` passes. Frontend checks were not rerun because this change is confined to the backend importer, its tests and documentation.

## Target verification

All three expected identifiers are mandatory arguments; none is hardcoded as universally approved. The CLI requires the installed `postgresql+psycopg` driver and explicit `sslmode=require`, `verify-ca` or `verify-full`.

Before inserts, the importer starts a read-only transaction on its connection, verifies `transaction_read_only=on`, reads the actual Neon project/branch and database, compares all three to the supplied values, then rolls back. Before every batch, it repeats the identity comparison **inside the same transaction and connection as that batch's insert**. A mismatch aborts without inserting that batch. The connection stays open for the import; no separate application Session or unchecked writer connection is used. Pooled endpoints are supported; direct administrative connections are preferable. A disconnected transaction fails rather than silently continuing on an unverified connection.

Expected identifiers must come from independently reviewed Console settings, not merely a hostname. Supplying the wrong target's matching IDs deliberately is still operator authorization of that target; the guard cannot infer production/development purpose. Importing into an approved branch does not approve other branches or change their data.

Before running, stop any older importer still processing this file. An old process retains the old code and transaction until it exits. Do not run old and new imports concurrently. Confirm its transaction outcome read-only after cancellation.

## Commands for the intended development target — not executed here

The requested target is project `still-math-23486169`, branch `br-odd-cake-axy2uqro`, database `neondb`. Confirm this target is the intended environment and that the existing backend configuration points there. Do not print the connection URL. Review the official dataset vintage/headers/checksums first; the file paths below are examples and must match your extracted files.

Run from the repository root in PowerShell:

```powershell
Set-Location 'C:/Users/Pokef/Projects/tutorME/backend'

.venv/Scripts/python.exe -m scripts.import_service_areas `
  'C:/data/2025_Gaz_place_national.txt' --kind place --year 2025 `
  --batch-size 1000 `
  --expected-project-id still-math-23486169 `
  --expected-branch-id br-odd-cake-axy2uqro `
  --expected-database neondb
if ($LASTEXITCODE -ne 0) { throw 'Places import stopped; review progress before continuing.' }

.venv/Scripts/python.exe -m scripts.import_service_areas `
  'C:/data/2025_Gaz_zcta_national.txt' --kind zcta --year 2025 `
  --batch-size 1000 `
  --expected-project-id still-math-23486169 `
  --expected-branch-id br-odd-cake-axy2uqro `
  --expected-database neondb
if ($LASTEXITCODE -ne 0) { throw 'ZCTA import stopped; review progress before continuing.' }
```

The importer reads `DATABASE_URL` from the backend settings; process overrides take precedence over `.env`. Avoid displaying either. No new environment variables, schema changes or feature-flag changes are required. Dataset source links and provenance preparation are in [development readiness](development-auth-readiness.md).

On startup expect `Import started`, followed by `Target verified` with exactly the three supplied IDs. Every batch prints `Batch committed` with batch/read/inserted/skipped/elapsed totals. Stop and investigate any mismatch/failure. A completely repeated import should report zero newly inserted rows and skip every valid record, while still checking coordinates and target identity.

## Read-only checks before and after

In a trusted SQL client connected privately to the intended branch:

```sql
BEGIN READ ONLY;
SHOW transaction_read_only;
SELECT current_setting('neon.project_id', true) AS project_id,
       current_setting('neon.branch_id', true) AS branch_id,
       current_database() AS database_name;
SELECT version_num FROM public.alembic_version;
SELECT source, country, count(*) FROM public.service_areas
GROUP BY source, country ORDER BY source, country;
SELECT CASE WHEN postal_code IS NULL THEN 'place' ELSE 'zcta' END AS kind,
       count(*) FROM public.service_areas
WHERE source = 'US Census Gazetteer 2025' GROUP BY 1;
SELECT count(*) AS invalid_coordinates FROM public.service_areas
WHERE NOT (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180);
ROLLBACK;
```

Record starting and ending counts. Account for pre-existing IDs and duplicates when comparing inserted totals; skipped entries remain unchanged. A revision mismatch needs review, not an automatic migration. Verify sample city/state/ZIP resolution through normal read-only application requests after the catalog is available. Do not import multiple vintages casually: year is part of the ID and multiple entries can make resolution ambiguous.

## Interruption and recovery

Ctrl+C or an error rolls back the active batch when the process can handle it. Previously committed batches remain visible and are intentionally preserved. Forced termination or a connection loss near commit can leave the last batch's outcome uncertain; PostgreSQL preserves transaction atomicity, and a repeat is safe either way.

1. Let the importer exit; do not start a second process while the first may still be writing.
2. Read the sanitized failure phase/progress and inspect counts read-only. Resolve the dataset, connection or constraint issue; do not delete imported rows to restart.
3. Reuse the same reviewed file, kind/year and expected target arguments. The primary key conflict rule skips all previously committed IDs and inserts missing ones.
4. Confirm final progress and read-only counts. Skipped records are never repaired/overwritten by rerunning; correcting a previously stored point requires a separately reviewed operation.

The importer intentionally does not provide all-file rollback. Batch size bounds memory and transaction size; choose a smaller batch when diagnosing failures. Coordinate validation still applies to duplicate input records. No live import or benchmark was run during this implementation.
