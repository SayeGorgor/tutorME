"""CI entrypoint: synthetic settings, explicit skip report, fail on new skips."""

import os
import unittest


def main():
    os.environ.update(
        DATABASE_URL="sqlite://",
        CSC_LOCATION_API_KEY="synthetic",
        CSC_API_URL="https://example.test",
        NEON_AUTH_BASE_URL="https://auth.example.test",
        NEON_AUTH_JWKS_URL="https://auth.example.test/jwks",
    )
    os.environ.pop("TUTORME_RUN_POSTGRES_TESTS", None)
    suite = unittest.defaultTestLoader.discover("tests")
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    allowed = {
        "test_postgres_booking_concurrency.PostgreSQLConcurrencyTests." + name
        for name in (
            "test_only_one_overlapping_request_can_be_confirmed",
            "test_online_and_in_person_compete_for_same_tutor",
            "test_student_cannot_confirm_overlapping_different_tutors",
        )
    }
    skipped = {test.id() for test, _ in result.skipped}
    print(
        f"Isolated suite: {result.testsRun} run, {len(result.failures)} failures, "
        f"{len(result.errors)} errors, {len(result.skipped)} skipped"
    )
    for test, reason in result.skipped:
        print(f"SKIPPED {test.id()}: {reason}")
    if skipped != allowed:
        print("Unexpected skip set or missing guarded integration tests")
        return 1
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
