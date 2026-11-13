"""No live connections: SQLite executes bulk conflict SQL; identity checks use mocks."""

import unittest
from unittest.mock import Mock, patch
from tempfile import TemporaryDirectory
from pathlib import Path
from sqlalchemy import create_engine, select, func, event
from sqlalchemy.dialects import postgresql
from scripts import import_service_areas as importer
from app.models.service_area import ServiceArea

TARGET = importer.Target("test-project", "br-synthetic", "testdb")
IDENTITY = (TARGET.project, TARGET.branch, TARGET.database)
HEADER = "GEOID|NAME|USPS|INTPTLAT|INTPTLONG\n"


class ImporterTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "synthetic.txt"
        self.engine = create_engine("sqlite://")
        ServiceArea.__table__.create(self.engine)
        self.connection = self.engine.connect()
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.connection.close)
        self.messages = []
        self.statements = []
        event.listen(
            self.engine,
            "before_cursor_execute",
            lambda conn, cursor, statement, parameters, context, many: self.statements.append(
                statement
            ),
        )

    def file(self, codes):
        self.path.write_text(
            HEADER + "".join(f"{code}|Synthetic {code}|TS|1|2\n" for code in codes),
            encoding="utf-8",
        )

    def run_import(self, size=2):
        # Only Neon-specific metadata queries are mocked; inserts/commits/rollback are real SQLite transactions.
        with (
            patch.object(importer, "verify_target"),
            patch.object(importer, "_read_identity", return_value=IDENTITY),
        ):
            return importer.import_areas(
                self.connection, self.path, "place", 2025, TARGET, size, self.messages.append
            )

    def count(self):
        value = self.connection.scalar(select(func.count()).select_from(ServiceArea))
        self.connection.rollback()
        return value

    def test_batching_and_progress(self):
        self.file(range(5))
        stats = self.run_import()
        self.assertEqual(stats, dict(read=5, inserted=5, skipped=0, batches=3))
        self.assertEqual(len([s for s in self.statements if s.startswith("INSERT")]), 3)
        self.assertFalse(any(s.startswith("SELECT") for s in self.statements))
        self.assertEqual(sum("Batch committed" in m for m in self.messages), 3)
        self.assertIn("Import started", self.messages[0])
        self.assertIn("Import completed", self.messages[-1])
        self.assertIn("elapsed=", self.messages[-1])
        self.assertEqual(self.count(), 5)

    def test_duplicate_ids_and_repeat_preserve_original(self):
        self.file([1, 1, 2, 1])
        first = self.run_import()
        self.assertEqual((first["inserted"], first["skipped"]), (2, 2))
        self.path.write_text(HEADER + "1|Changed|XX|10|20\n2|Changed|XX|10|20\n")
        again = self.run_import()
        self.assertEqual((again["inserted"], again["skipped"]), (0, 2))
        row = (
            self.connection.execute(
                select(ServiceArea.__table__).where(ServiceArea.id == "census-2025-place-1")
            )
            .mappings()
            .one()
        )
        self.assertEqual(row["name"], "Synthetic 1")
        self.assertEqual(row["latitude"], 1)
        self.connection.rollback()

    def test_failed_batch_rolls_back_and_resume(self):
        self.file(range(5))
        calls = [0]

        def fail_second(conn, cursor, statement, parameters, context, many):
            if statement.startswith("INSERT"):
                calls[0] += 1
                if calls[0] == 2:
                    raise RuntimeError("private driver detail must not print")

        event.listen(self.engine, "before_cursor_execute", fail_second)
        with self.assertRaises(importer.ImportFailure):
            self.run_import()
        event.remove(self.engine, "before_cursor_execute", fail_second)
        self.assertEqual(self.count(), 2)
        self.assertNotIn("private driver", str(self.messages))
        stats = self.run_import()
        self.assertEqual((stats["inserted"], stats["skipped"]), (3, 2))
        self.assertEqual(self.count(), 5)

    def test_failure_within_batch_rolls_back_entire_batch(self):
        self.file([1, 2])
        # A database-side failure in the second row must also undo the first row of that batch.
        self.connection.exec_driver_sql(
            "CREATE TRIGGER reject_second BEFORE INSERT ON service_areas WHEN NEW.id = 'census-2025-place-2' BEGIN SELECT RAISE(ABORT, 'synthetic'); END"
        )
        self.connection.commit()
        with self.assertRaises(importer.ImportFailure):
            self.run_import()
        self.assertEqual(self.count(), 0)

    def test_coordinate_validation(self):
        for latitude, longitude in (
            ("nan", "0"),
            ("inf", "0"),
            ("91", "0"),
            ("0", "-181"),
            ("bad", "0"),
        ):
            self.path.write_text(HEADER + f"1|Test|TS|{latitude}|{longitude}\n")
            with self.subTest(latitude=latitude, longitude=longitude):
                with self.assertRaises(ValueError):
                    list(importer.read_areas(self.path, "place", 2025))
        self.path.write_text(HEADER + "1|Test|TS|-90|180\n")
        self.assertEqual(list(importer.read_areas(self.path, "place", 2025))[0].longitude, 180)

    def test_empty_and_header_only(self):
        for content in ("", "   \n", HEADER):
            self.path.write_text(content)
            self.assertEqual(self.run_import()["read"], 0)
        self.assertEqual(self.count(), 0)

    def test_malformed_records_and_headers(self):
        for content in (
            "WRONG|HEADER\n1|2\n",
            HEADER + "|Test|TS|1|2\n",
            HEADER + "1|Test|TS|1\n",
            HEADER + "1|Test|TS|1|2|extra\n",
            HEADER + "1|" + "x" * 256 + "|TS|1|2\n",
        ):
            self.path.write_text(content)
            with self.assertRaises(ValueError):
                list(importer.read_areas(self.path, "place", 2025))

    def test_parse_failure_preserves_committed_batches_and_resume(self):
        self.file([1, 2])
        self.path.write_text(self.path.read_text() + "3|Test|TS|nan|2\n")
        with self.assertRaises(importer.ImportFailure):
            self.run_import()
        self.assertEqual(self.count(), 2)
        self.file([1, 2, 3])
        stats = self.run_import()
        self.assertEqual((stats["inserted"], stats["skipped"]), (1, 2))

    def test_same_transaction_identity_mismatch_prevents_insert(self):
        self.file([1])
        with (
            patch.object(importer, "verify_target"),
            patch.object(
                importer, "_read_identity", return_value=("wrong", TARGET.branch, TARGET.database)
            ),
        ):
            with self.assertRaises(importer.ImportFailure):
                importer.import_areas(
                    self.connection, self.path, "place", 2025, TARGET, emit=self.messages.append
                )
        self.assertFalse(any(s.startswith("INSERT") for s in self.statements))

    def test_readonly_guard_and_rollback(self):
        for identity in (
            IDENTITY,
            ("wrong", TARGET.branch, TARGET.database),
            (TARGET.project, "wrong", TARGET.database),
            (TARGET.project, TARGET.branch, "wrong"),
        ):
            conn = Mock()
            conn.scalar.return_value = "on"
            with patch.object(importer, "_read_identity", return_value=identity):
                if identity == IDENTITY:
                    importer.verify_target(conn, TARGET)
                else:
                    with self.assertRaises(importer.ImportFailure):
                        importer.verify_target(conn, TARGET)
            conn.exec_driver_sql.assert_called_once_with("SET TRANSACTION READ ONLY")
            conn.rollback.assert_called_once()
        conn = Mock()
        conn.scalar.return_value = "off"
        with self.assertRaises(importer.ImportFailure):
            importer.verify_target(conn, TARGET)
        conn.rollback.assert_called_once()

    def test_zcta_tsv_bom_and_provenance(self):
        self.path.write_text("\ufeffGEOID\tINTPTLAT\tINTPTLONG\n00123\t1\t2\n", encoding="utf-8")
        area = list(importer.read_areas(self.path, "zcta", 2025))[0]
        self.assertEqual(
            (area.id, area.postal_code, area.source),
            ("census-2025-zcta-00123", "00123", "US Census Gazetteer 2025"),
        )

    def test_postgres_sql_uses_primary_key_conflict_and_returning(self):
        sql = str(
            importer.batch_statement(
                [
                    dict(
                        id="test",
                        name="Test",
                        region="TS",
                        country="US",
                        postal_code=None,
                        latitude=0,
                        longitude=0,
                        source="synthetic",
                    )
                ]
            ).compile(dialect=postgresql.dialect())
        )
        self.assertIn("ON CONFLICT (id) DO NOTHING", sql)
        self.assertIn("RETURNING service_areas.id", sql)

    def test_default_output_flushes_and_cli_requires_identity(self):
        self.path.write_text("")
        with patch.object(importer, "verify_target"), patch("builtins.print") as output:
            importer.import_areas(self.connection, self.path, "place", 2025, TARGET)
            self.assertTrue(all(call.kwargs.get("flush") is True for call in output.call_args_list))
        with patch("sys.stderr"), self.assertRaises(SystemExit):
            importer.main([str(self.path), "--kind", "place", "--year", "2025"])

    def test_initial_verification_failure_never_inserts(self):
        self.file([1])
        with patch.object(
            importer, "verify_target", side_effect=importer.ImportFailure("Target mismatch")
        ):
            with self.assertRaises(importer.ImportFailure):
                importer.import_areas(
                    self.connection, self.path, "place", 2025, TARGET, emit=self.messages.append
                )
        self.assertFalse(any(s.startswith("INSERT") for s in self.statements))
        self.assertEqual(self.count(), 0)

    def test_cancelled_import_preserves_prior_commits(self):
        self.file([1, 2, 3])
        areas = list(importer.read_areas(self.path, "place", 2025))

        def interrupted(*args):
            yield from areas[:2]
            raise KeyboardInterrupt()

        with patch.object(importer, "read_areas", side_effect=interrupted):
            with self.assertRaises(importer.ImportFailure):
                self.run_import()
        self.assertEqual(self.count(), 2)
        stats = self.run_import()
        self.assertEqual((stats["inserted"], stats["skipped"]), (1, 2))
