"""Fail-closed approval/identity checks for an opt-in, disposable Neon test."""

from dataclasses import dataclass, field
import re
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool

PROTECTED_BRANCH = "br-royal-bird-ax5hkimq"
PROTECTED_ENDPOINT = "ep-sparkling-voice-ax3w37ou"
DEVELOPMENT_BRANCH = "br-odd-cake-axy2uqro"
DEVELOPMENT_ENDPOINT = "ep-lucky-resonance-ax8nmonu"
EXCLUDED_BRANCHES = {PROTECTED_BRANCH, DEVELOPMENT_BRANCH}
EXCLUDED_ENDPOINTS = {PROTECTED_ENDPOINT, DEVELOPMENT_ENDPOINT}
STATEMENT_TIMEOUT_MS = 15000
LOCK_TIMEOUT_MS = 5000


@dataclass(frozen=True)
class ApprovedTarget:
    url: str = field(repr=False)
    project: str
    branch: str
    database: str


def approved_target(environment):
    if (
        environment.get("TUTORME_RUN_POSTGRES_TESTS") != "1"
        or environment.get("TUTORME_TEST_DATABASE_IS_DISPOSABLE") != "1"
    ):
        raise RuntimeError("Explicit opt-in and disposable-environment approval are required")
    project, branch, database = (
        environment.get(key, "")
        for key in (
            "TUTORME_TEST_PROJECT_ID",
            "TUTORME_TEST_BRANCH_ID",
            "TUTORME_TEST_DATABASE_NAME",
        )
    )
    if (
        not re.fullmatch(r"[a-z0-9-]{1,60}", project)
        or not re.fullmatch(r"br-[a-z0-9-]{1,60}", branch)
        or not database
    ):
        raise RuntimeError(
            "Explicit expected project, branch and database identifiers are required"
        )
    if branch in EXCLUDED_BRANCHES:
        raise RuntimeError(
            "Established production/development branches are excluded from this disposable test"
        )
    raw = environment.get("TUTORME_TEST_DATABASE_URL", "")
    try:
        url = make_url(raw)
    except Exception:
        raise RuntimeError("Provide a valid disposable PostgreSQL connection privately") from None
    if url.drivername != "postgresql+psycopg" or not url.host or url.database != database:
        raise RuntimeError("Use a matching PostgreSQL psycopg database target")
    if url.host.split(".")[0].replace("-pooler", "") in EXCLUDED_ENDPOINTS:
        raise RuntimeError("The inspected endpoint is permanently excluded from this test")
    if "-pooler." in url.host:
        raise RuntimeError("Use a direct endpoint for isolated-schema administrative tests")
    if url.query.get("sslmode") not in ("require", "verify-ca", "verify-full"):
        raise RuntimeError("Explicit TLS is required")
    return ApprovedTarget(raw, project, branch, database)


def test_engine(target):
    return create_engine(
        target.url,
        poolclass=NullPool,
        hide_parameters=True,
        connect_args={
            "connect_timeout": 5,
            "options": f"-c statement_timeout={STATEMENT_TIMEOUT_MS} -c lock_timeout={LOCK_TIMEOUT_MS} -c idle_in_transaction_session_timeout=15000",
        },
    )


def verify_connection(connection, target):
    try:
        connection.exec_driver_sql("SET TRANSACTION READ ONLY")
        if connection.scalar(text("SHOW transaction_read_only")) != "on":
            raise RuntimeError("Read-only target verification failed")
        actual = connection.execute(
            text(
                "SELECT current_setting('neon.project_id',true), current_setting('neon.branch_id',true), current_database()"
            )
        ).one()
        if actual[1] in EXCLUDED_BRANCHES:
            raise RuntimeError("The actual database is an excluded established branch")
        if tuple(actual) != (target.project, target.branch, target.database):
            raise RuntimeError(
                "Actual database identity does not match the approved disposable target"
            )
    finally:
        connection.rollback()
