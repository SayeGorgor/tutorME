"""Exercise the Alembic entrypoint without opening a database connection."""

import os
from pathlib import Path
import runpy
import unittest
from unittest.mock import MagicMock, patch

import test_locations  # Set synthetic application settings before imports.
from alembic.config import Config


class AlembicConnectionTests(unittest.TestCase):
    def test_generic_supplied_connection_is_rejected_before_migrations(self):
        config = Config()
        config.attributes["connection"] = MagicMock()
        with (
            patch.dict(os.environ, {}, clear=True),
            patch("alembic.context.config", config, create=True),
            patch("alembic.context.is_offline_mode", return_value=False),
            patch("alembic.context.configure") as configure,
            patch("alembic.context.run_migrations") as migrate,
            patch("sqlalchemy.engine_from_config") as engine,
        ):
            with self.assertRaises(RuntimeError):
                runpy.run_path(str(Path(__file__).resolve().parents[1] / "alembic" / "env.py"))
            configure.assert_not_called()
            migrate.assert_not_called()
            engine.assert_not_called()

    def test_normal_cli_without_supplied_connection_keeps_configured_engine(self):
        config = Config()
        connection = MagicMock()
        with (
            patch("alembic.context.config", config, create=True),
            patch("alembic.context.is_offline_mode", return_value=False),
            patch("alembic.context.configure") as configure,
            patch("alembic.context.begin_transaction", return_value=MagicMock()),
            patch("alembic.context.run_migrations") as migrate,
            patch("sqlalchemy.engine_from_config") as engine,
            patch("scripts.container_guard.verify_migration_connection") as verify,
        ):
            engine.return_value.connect.return_value.__enter__.return_value = connection
            runpy.run_path(str(Path(__file__).resolve().parents[1] / "alembic" / "env.py"))
            engine.assert_called_once()
            self.assertEqual(engine.call_args.args[0]["sqlalchemy.url"], "sqlite://")
            self.assertIs(configure.call_args.kwargs["connection"], connection)
            migrate.assert_called_once()
            verify.assert_not_called()
