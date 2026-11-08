# Require expiring API JWTs and add isolated CI verification

Proposed base: `master`. Proposed head: `security/tutorme-auth-ci-hardening`.
This is a local PR draft; no GitHub PR has been created.

## Problem and behavior

The API verified expiration only when a JWT included it, allowing a correctly signed token without `exp` to pass. Require `exp`, `iss`, `aud` and `sub`, preserve fixed EdDSA and issuer/audience validation, and reject unsupported algorithms before JWKS lookup. Validate optional issued-at/not-before claims through PyJWT with the existing ten-second clock allowance.

Bound JWKS fetches to five seconds while retaining the five-minute set cache, rotation refresh cooldown and no indefinite individual-key cache. Malformed claim/JWKS data rejects with generic authentication errors. Signature verification and database-backed role/ownership checks remain authoritative; no login fallback or client-controlled privilege was introduced.

## Automated verification

Add three independent GitHub Actions jobs with read-only permissions, reviewed SHA-pinned actions, synthetic settings, no secrets and no deployment:

- Frontend: clean npm installation, 51 existing Node tests, TypeScript, ESLint, font-connectivity diagnosis and a real Next.js production build.
- Backend: pinned requirements, dependency consistency, complete isolated JWT/authorization suite, source compilation and offline Alembic SQL generation. The runner reports exactly three intentional Neon race skips and rejects unexpected skips.
- PostgreSQL: fresh job-owned service, independent loopback/marker guard, real Alembic upgrades, revision/model comparison and five mandatory schema/authorization/concurrency tests. No ORM schema fallback or hosted database credentials are used. Existing Neon guards/exclusions remain intact.

Supplied Alembic connections require the explicit CI contract and exact service URL plus server identity/emptiness revalidation before migrations. Normal CLI behavior is regression-tested. The service is removed by GitHub's job lifecycle; no established database cleanup or migration is attempted.

## Validation and limitations

Local actionlint 1.7.12 passes. Complete backend suite: 143 run, 140 passed, three expected skips. Offline SQL generation, Python compilation and migration-connection safety tests pass. Most recent frontend evidence: 51 passed, TypeScript passed, ESLint passed with four existing warnings; clean offline npm install passed.

Local production build remains blocked by Google Fonts connectivity. Actual GitHub workflow execution, PostgreSQL migration/schema/races and hosted authentication acceptance have not run. CI must establish those results before any green-status claim. Offline JWTs can remain valid after logout/revocation until expiration plus skew; this patch does not add introspection. Container PostgreSQL is separate from Neon integration, and metadata comparison does not prove every enum/check/default. No production schema change is required by JWT hardening.

## First real CI review checklist

- [ ] Record run URL, tested commit SHA, event and branch; ensure all jobs tested the intended head/PR merge commit as applicable.
- [ ] `Frontend checks`: clean installation, all 51 tests, type checking, lint and complete production build succeed. Record actual totals/warnings and font error categories.
- [ ] `Backend isolated checks`: record actual totals (current expectation: 140 passed, three specified Neon skips), JWT/authorization results, dependency consistency and offline migration head.
- [ ] `PostgreSQL migrated integration`: identity/empty-database checks and real migrations succeed; head matches; all five tests run with zero failures/skips and no model drift suppression.
- [ ] Verify only synthetic service credentials/endpoints were used; no hosted data or provider settings changed.
- [ ] Review service teardown and any failure/cancellation; do not repoint the harness at Neon.
- [ ] Investigate failures with the smallest safe patch and require a new run for its new SHA; preserve guards, migrations, TLS and tests.
- [ ] Keep hosted signup/OAuth/verification/onboarding/session/logout/key-rotation acceptance marked unverified until controlled staging evidence exists.
- [ ] Reassess release readiness separately; this PR does not authorize deployment or merging into master.

Detailed evidence and first-run capture template: [preparation report](first-actions-validation-2026-11-08.md). Rollback and hosted acceptance: [release-readiness report](auth-release-readiness-2026-11-08.md).
