"""No database calls; rejection tests for the independent service guard."""
import unittest
from unittest.mock import Mock, patch
from sqlalchemy.engine import make_url

from scripts.container_guard import approved_container, container_engine, verify_container, verify_migration_connection


class ContainerGuardTests(unittest.TestCase):
    def test_supplied_migration_connection_requires_ci_before_sql(self):
        connection = Mock()
        with self.assertRaises(RuntimeError):
            verify_migration_connection(connection, {})
        connection.execute.assert_not_called()
        connection.exec_driver_sql.assert_not_called()

    def test_supplied_migration_connection_rejects_other_targets_before_sql(self):
        connection = Mock()
        for url in ("postgresql+psycopg://test:test@hosted.example/live",
                    "postgresql+psycopg://tutorme_ci:synthetic-container-only@127.0.0.1:54322/tutorme_ci"):
            connection.engine.url = make_url(url)
            with self.assertRaises(RuntimeError):
                verify_migration_connection(connection, self.environment())
        connection.execute.assert_not_called()
        connection.exec_driver_sql.assert_not_called()

    def test_supplied_migration_connection_rechecks_empty_server_identity(self):
        target = approved_container(self.environment())
        engine = container_engine(target)
        connection = Mock()
        connection.engine.url = engine.url
        with patch("scripts.container_guard.verify_container") as verify:
            verify_migration_connection(connection, self.environment())
            verify.assert_called_once_with(connection, target, empty=True)
        engine.dispose()

    def environment(self):
        return dict(GITHUB_ACTIONS="true", TUTORME_CONTAINER_TESTS="1",
                    GITHUB_RUN_ID="123", GITHUB_RUN_ATTEMPT="1", TUTORME_CONTAINER_PORT="54321")

    def test_requires_every_opt_in_and_valid_identity(self):
        env = self.environment()
        for key in env:
            with self.subTest(key=key), self.assertRaises(RuntimeError):
                approved_container({k: v for k, v in env.items() if k != key})
        for key, value in (("TUTORME_CONTAINER_PORT", "5432/remote"), ("TUTORME_CONTAINER_PORT", "0"),
                           ("GITHUB_RUN_ID", "';DROP DATABASE x"), ("GITHUB_ACTIONS", "false")):
            with self.assertRaises(RuntimeError):
                approved_container({**env, key: value})

    def test_hosted_urls_cannot_override_target(self):
        env = {**self.environment(), "DATABASE_URL": "postgresql://production.invalid/live"}
        engine = container_engine(approved_container(env))
        self.assertEqual(engine.url.host, "127.0.0.1")
        self.assertEqual(engine.url.database, "tutorme_ci")
        engine.dispose()

    def test_server_identity_and_empty_database_required(self):
        target = approved_container(self.environment())
        for actual in (("production", "tutorme_ci", target.marker),
                       ("tutorme_ci", "wrong", target.marker), ("tutorme_ci", "tutorme_ci", None)):
            conn = Mock()
            conn.scalar.return_value = "on"
            conn.execute.return_value.one.return_value = actual
            with self.assertRaises(RuntimeError):
                verify_container(conn, target)
            conn.rollback.assert_called_once()
        conn = Mock()
        conn.execute.return_value.one.return_value = ("tutorme_ci", "tutorme_ci", target.marker)
        conn.scalar.side_effect = ["on", 1]
        with self.assertRaises(RuntimeError):
            verify_container(conn, target, empty=True)
        conn.rollback.assert_called_once()

    def test_readonly_success_always_rolls_back(self):
        target = approved_container(self.environment())
        conn = Mock()
        conn.scalar.side_effect = ["on", 0]
        conn.execute.return_value.one.return_value = ("tutorme_ci", "tutorme_ci", target.marker)
        verify_container(conn, target, empty=True)
        conn.exec_driver_sql.assert_called_once_with("SET TRANSACTION READ ONLY")
        conn.rollback.assert_called_once()
