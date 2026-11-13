"""Independent guard for the workflow-owned loopback PostgreSQL service only.

Never accepts application/Neon URLs. Environment values are not a substitute
for the workflow's fresh, unmounted service container lifecycle.
"""

import re
from dataclasses import dataclass

from sqlalchemy import URL, create_engine, text
from sqlalchemy.pool import NullPool


@dataclass(frozen=True)
class ContainerTarget:
    port: int
    marker: str


def approved_container(environment):
    if (
        environment.get("GITHUB_ACTIONS") != "true"
        or environment.get("TUTORME_CONTAINER_TESTS") != "1"
    ):
        raise RuntimeError("Workflow-owned disposable container opt-in required")
    run, attempt = (environment.get(k, "") for k in ("GITHUB_RUN_ID", "GITHUB_RUN_ATTEMPT"))
    port = environment.get("TUTORME_CONTAINER_PORT", "")
    if not re.fullmatch(r"[0-9]{1,20}", run) or not re.fullmatch(r"[0-9]{1,6}", attempt):
        raise RuntimeError("Invalid workflow identity")
    if not port.isdecimal() or not 1024 <= int(port) <= 65535:
        raise RuntimeError("Invalid isolated service port")
    return ContainerTarget(int(port), f"tutorme-ci:{run}:{attempt}")


def container_engine(target):
    # No caller-controlled host, credentials, URL options, or database names.
    return create_engine(
        URL.create(
            "postgresql+psycopg",
            username="tutorme_ci",
            password="synthetic-container-only",
            host="127.0.0.1",
            port=target.port,
            database="tutorme_ci",
        ),
        poolclass=NullPool,
        hide_parameters=True,
        connect_args={
            "connect_timeout": 5,
            "options": "-c statement_timeout=15000 -c lock_timeout=5000 -c idle_in_transaction_session_timeout=15000",
        },
    )


def verify_container(connection, target, *, empty=False):
    try:
        connection.exec_driver_sql("SET TRANSACTION READ ONLY")
        if connection.scalar(text("SHOW transaction_read_only")) != "on":
            raise RuntimeError("Container identity check must be read-only")
        actual = connection.execute(
            text("""SELECT current_database(), current_user,
            shobj_description(oid, 'pg_database') FROM pg_database WHERE datname=current_database()""")
        ).one()
        if tuple(actual) != ("tutorme_ci", "tutorme_ci", target.marker):
            raise RuntimeError("Database is not the marked workflow service")
        if (
            empty
            and connection.scalar(
                text("""SELECT count(*) FROM information_schema.tables
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')""")
            )
            != 0
        ):
            raise RuntimeError("Refusing migrations on a nonempty container database")
    finally:
        connection.rollback()


def verify_migration_connection(connection, environment):
    """Reject generic supplied connections outside the explicit CI contract."""
    target = approved_container(environment)
    expected = URL.create(
        "postgresql+psycopg",
        username="tutorme_ci",
        password="synthetic-container-only",
        host="127.0.0.1",
        port=target.port,
        database="tutorme_ci",
    )
    if connection.engine.url != expected:
        raise RuntimeError("Supplied migration connection is not the workflow service")
    verify_container(connection, target, empty=True)
