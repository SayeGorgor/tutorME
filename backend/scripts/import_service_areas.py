"""Import independent Census points into an explicitly identified PostgreSQL target.
Batches commit independently. A cancelled/failed import may be partially committed;
rerun the same file/vintage to skip existing IDs without overwriting any points.
"""
import argparse
import csv
from dataclasses import dataclass
import math
from pathlib import Path
import time

from sqlalchemy import create_engine, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.pool import NullPool
from app.models.service_area import ServiceArea


@dataclass(frozen=True)
class Target:
    project: str
    branch: str
    database: str


class ImportFailure(Exception):
    """Sanitized operator-facing failure; never includes driver SQL/parameters."""


def read_areas(path: Path, kind: str, year: int):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        sample = stream.read(4096)
        if not sample.strip():
            return
        stream.seek(0)
        delimiter = "|" if "|" in sample.splitlines()[0] else "\t"
        reader = csv.DictReader(stream, delimiter=delimiter, strict=True)
        headers = [key.strip() for key in (reader.fieldnames or [])]
        if not {"GEOID", "INTPTLAT", "INTPTLONG"}.issubset(headers) or len(set(headers)) != len(headers):
            raise ValueError("Missing or duplicate Census headers: require GEOID, INTPTLAT, INTPTLONG")
        try:
            for raw in reader:
                try:
                    if None in raw or any(value is None for value in raw.values()):
                        raise ValueError("Incorrect number of columns")
                    row = {key.strip(): value.strip() for key, value in raw.items()}
                    code = row["GEOID"]
                    if not code:
                        raise ValueError("Missing GEOID")
                    lat, lng = float(row["INTPTLAT"]), float(row["INTPTLONG"])
                    if not (math.isfinite(lat) and math.isfinite(lng) and -90 <= lat <= 90 and -180 <= lng <= 180):
                        raise ValueError("Invalid Census coordinates")
                    area = ServiceArea(id=f"census-{year}-{kind}-{code}",
                        name=row.get("NAME") or f"ZIP area {code}", region=row.get("USPS", ""), country="US",
                        postal_code=code if kind == "zcta" else None, latitude=lat, longitude=lng,
                        source=f"US Census Gazetteer {year}")
                    for column in ServiceArea.__table__.columns:
                        value = getattr(area, column.name)
                        limit = getattr(column.type, "length", None)
                        if limit and value is not None and len(value) > limit:
                            raise ValueError("Census value exceeds schema field length")
                except (ValueError, KeyError, TypeError):
                    raise ValueError(f"Malformed Census record near line {reader.line_num}: check GEOID, columns and finite coordinate bounds") from None
                yield area
        except csv.Error:
            raise ValueError(f"Malformed delimited record near line {reader.line_num}") from None


def _read_identity(connection):
    return tuple(connection.execute(text("SELECT current_setting('neon.project_id', true), current_setting('neon.branch_id', true), current_database()" )).one())


def _assert_identity(actual, expected):
    if actual != (expected.project, expected.branch, expected.database):
        raise ImportFailure("Database project/branch/database mismatch; no writes permitted on this target")


def verify_target(connection, expected):
    # Pin one SQLAlchemy connection. Roll back this read-only transaction before batches.
    try:
        connection.exec_driver_sql("SET TRANSACTION READ ONLY")
        if connection.scalar(text("SHOW transaction_read_only")) != "on":
            raise ImportFailure("Could not establish read-only target verification")
        _assert_identity(_read_identity(connection), expected)
    finally:
        connection.rollback()


def batch_statement(rows):
    return insert(ServiceArea.__table__).values(rows).on_conflict_do_nothing(
        index_elements=[ServiceArea.__table__.c.id]
    ).returning(ServiceArea.__table__.c.id)


def import_areas(connection, path, kind, year, expected, batch_size=1000, emit=None):
    if not 1 <= batch_size <= 5000:
        raise ValueError("Batch size must be between 1 and 5000")
    if not all((expected.project, expected.branch, expected.database)):
        raise ValueError("Explicit expected project, branch and database are required")
    if kind not in ("place", "zcta") or year not in range(2020, 2027):
        raise ValueError("Unsupported kind/year")
    emit = emit or (lambda message: print(message, flush=True))
    started = time.monotonic()
    read = inserted = skipped = batches = 0
    phase = "target verification"
    def progress(label):
        emit(f"{label}: batches={batches} read={read} inserted={inserted} skipped={skipped} elapsed={time.monotonic()-started:.1f}s")
    emit(f"Import started: dataset={path.name} kind={kind} year={year} batch_size={batch_size}")
    def write_batch(rows):
        nonlocal inserted, skipped, batches, phase
        phase = f"batch {batches + 1}"
        with connection.begin():
            # Recheck identity INSIDE the same transaction as the insert (also safe with pooling).
            _assert_identity(_read_identity(connection), expected)
            count = len(connection.execute(batch_statement(rows)).scalars().all())
        # Count only after the transaction commits successfully.
        inserted += count
        skipped += len(rows) - count
        batches += 1
        progress("Batch committed")
    try:
        verify_target(connection, expected)
        emit(f"Target verified: project={expected.project} branch={expected.branch} database={expected.database}")
        rows = []
        phase = "dataset parsing"
        for area in read_areas(path, kind, year):
            read += 1
            rows.append({column.name: getattr(area, column.name) for column in ServiceArea.__table__.columns})
            if len(rows) == batch_size:
                write_batch(rows)
                rows = []
                phase = "dataset parsing"
        if rows:
            write_batch(rows)
        progress("Import completed")
        return {"read": read, "inserted": inserted, "skipped": skipped, "batches": batches}
    except (Exception, KeyboardInterrupt) as exc:
        connection.rollback()
        progress("Import stopped")
        reason = str(exc) if isinstance(exc, (ImportFailure, ValueError)) else type(exc).__name__
        # Only our own validation ValueErrors reach here; do not print driver exception details.
        if isinstance(exc, ValueError) and not reason.startswith(("Malformed", "Missing or duplicate")):
            reason = "Invalid dataset encoding or format"
        emit(f"Failed during {phase}: {reason}. Earlier committed batches remain; correct the issue and rerun the same file to skip existing IDs.")
        raise ImportFailure("Import did not complete; see sanitized progress above") from None


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path)
    parser.add_argument("--kind", choices=("place", "zcta"), required=True)
    parser.add_argument("--year", type=int, choices=range(2020, 2027), required=True)
    parser.add_argument("--batch-size", type=int, default=1000, choices=range(1, 5001), metavar="1-5000")
    parser.add_argument("--expected-project-id", required=True)
    parser.add_argument("--expected-branch-id", required=True)
    parser.add_argument("--expected-database", required=True)
    args = parser.parse_args(argv)
    # Lazy configuration/engine creation: parser unit tests and --help need no DB setup.
    from app.core.config import settings
    from sqlalchemy.engine import make_url
    engine = None
    try:
        url = make_url(settings.database_url)
        if url.drivername != "postgresql+psycopg":
            raise ImportFailure("Use the installed postgresql+psycopg driver")
        if url.query.get("sslmode") not in ("require", "verify-ca", "verify-full"):
            raise ImportFailure("Explicit PostgreSQL TLS is required")
        engine = create_engine(url, poolclass=NullPool, hide_parameters=True, connect_args={"connect_timeout": 10})
        with engine.connect() as connection:
            import_areas(connection, args.file, args.kind, args.year,
                Target(args.expected_project_id, args.expected_branch_id, args.expected_database), args.batch_size)
        return 0
    except (Exception, KeyboardInterrupt) as exc:
        reason = str(exc) if isinstance(exc, ImportFailure) else type(exc).__name__
        print(f"Import failed: {reason}", flush=True)
        return 1
    finally:
        if engine is not None:
            engine.dispose()


if __name__ == "__main__":
    raise SystemExit(main())
