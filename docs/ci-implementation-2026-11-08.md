# CI implementation report — November 8, 2026

**Reviewable implementation complete; GitHub execution and PostgreSQL integration remain unverified.** No workflow was pushed, committed or dispatched. No production/development database, provider setting, credential or authentication validation was changed. The existing Task 1/2 working-tree changes were preserved. This report does not supersede the blocked production [release assessment](auth-release-readiness-2026-11-08.md).

Follow-up: [Task 4 preparation](first-actions-validation-2026-11-08.md) records authoritative actionlint validation, the service-port expression correction, additional migration-connection safeguards/tests, and the prepared local review branch. Results below remain the dated Task 3 evidence.

## Files introduced or modified by Task 3

| File | Purpose |
| --- | --- |
| `.github/workflows/ci.yml` | Three independent jobs, synthetic environment, pinned actions and bounded execution |
| `backend/alembic/env.py` | Optional externally supplied connection for already verified CI migration execution; normal CLI path unchanged |
| `backend/scripts/container_guard.py` | Separate loopback-service approval/identity/empty-database checks |
| `backend/scripts/run_isolated_tests.py` | Synthetic full-suite runner with exact expected-skip enforcement |
| `backend/integration/run_container.py` | Real migrations, revision check and five mandatory PostgreSQL tests |
| `backend/tests/test_container_guard.py` | Four isolated guard rejection/success tests |
| `README.md` | Concise project/testing entrypoint without an unearned green badge |
| `docs/testing.md` | Commands, environment boundaries, integration strategy and limitations |
| `docs/ci-implementation-2026-11-08.md` | This implementation/verification report |

The JWT verifier/test/report changes visible in the working tree predate Task 3 and remain intact. Existing Neon concurrency code and its protected-target exclusions were not edited. No dependency manifest/lockfile or font/CSP/application feature changed.

## Jobs and security review

`Frontend checks` runs `npm ci`, the existing Node suite, TypeScript, ESLint, an informational HTTPS font probe and a mandatory real production build. `Backend isolated checks` installs pinned requirements, checks dependency consistency, executes the entire isolated suite (including JWT/authorization), compiles Python sources and renders PostgreSQL Alembic SQL offline. `PostgreSQL migrated integration` installs the same dependencies, marks its own fresh service, verifies identity/emptiness, upgrades the real migration chain and requires all five integration tests without skips.

Node 26 is now LTS according to the [official Node release table](https://nodejs.org/en/about/previous-releases), and matches the locally available v26.13.0. Python 3.14 matches the local v3.14.3 and installed pinned packages. CI selects those minor/major lines to receive patch fixes; exact resolved tool versions remain in action logs. Future compatibility and Linux wheel availability still require the first CI install.

The workflow uses `push`, `pull_request` and manual dispatch, never `pull_request_target`. It grants only `contents: read`, disables checkout credential persistence, uses fresh GitHub-hosted Ubuntu runners, and references no secrets or deployment environments. No persistent runners, shared dependency caches, build caches or artifact publication are configured. npm cache automation is explicitly disabled. Dependency install scripts still execute in the ephemeral runner and can access its network: review dependency/lockfile changes and fork workflow changes accordingly. No production credentials are available to them. Repository-level approval of fork workflows should remain enabled.

Actions are pinned to full commits verified against official releases: [checkout v6.0.0](https://github.com/actions/checkout/commit/1af3b93b6815bc44a9784bd300feb67ff0d1eeb3), [setup-node v6.0.0](https://github.com/actions/setup-node/commit/2028fbc5c25fe9cf00d9f06a71cc4710d4507903), and [setup-python v6.0.0](https://github.com/actions/setup-python/commit/e797f83bcb11b83ae66e0230d6156d7c80228e7c). Review and update pins deliberately as security fixes arrive. PostgreSQL uses the explicit official `17.6-bookworm` image tag; it is not digest-pinned, so absolute image immutability is a remaining reproducibility limitation. The PostgreSQL patch version is a fixture baseline, not a production recommendation or advisory clearance.

All settings are synthetic, including the public CI-only cookie secret and service password. No `.env` copying or environment dumps occur. Job summaries describe evidence boundaries and individual step outcomes; they do not assert success unconditionally. The backend runner lists the three intentional Neon skips and fails if a new skip appears. Integration fails if any of its five tests skips or fails. No continue-on-error fallback hides a build/database failure. No raw logs/browser artifacts are uploaded automatically.

## PostgreSQL isolation and coverage

[GitHub service containers](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers) provide a dedicated PostgreSQL instance per job on a random mapped port. No volume or hosted connection is configured. Only the workflow-known container ID is used to bootstrap a run/attempt database comment. The independent guard fixes the connection host to `127.0.0.1`, database/user/password to synthetic fixture values, validates run/port fields, verifies the database/user/comment in a read-only transaction, and requires no existing application tables before migrations. `DATABASE_URL`, hosted URLs and Neon opt-ins cannot repoint this target. Container TLS is not enabled for the local-only fixture; the separate Neon TLS requirements remain intact.

The runner supplies that already verified connection to Alembic and checks the revision against migration heads. It never substitutes `create_all`, stamps a revision or suppresses model differences. A test compares migrated schema to ORM metadata using Alembic's supported comparisons. This does not comprehensively compare PostgreSQL enum members, every check expression or server default. Any migration/schema failure stays a failed integration job for investigation.

The tests use unique synthetic users/tutors/subjects/areas, real participant locks and committed PostgreSQL state. Three cases race confirmations for one tutor, across formats, and across two tutors for the same student. Each requires one success and one conflict, confirmed/pending persisted rows, intact quote fields and usable loser transactions. The authorization case rejects tutor booking creation, student confirmation, another student's cancellation/read and another tutor's confirmation, then exercises valid tutor confirmation and student cancellation. These are service-level authorization tests; HTTP guest/JWT/profile ownership coverage remains in the isolated suite. They do not establish hosted Neon-specific database or OAuth behavior.

Connect, statement, lock, idle-transaction, barrier and future timeouts plus the job timeout bound failures. Each worker verifies identity. No explicit database/schema drop occurs; GitHub tears down only its own service after success, failure or cancellation. Fixture rows never leave the unmounted service. Opt-ins/markers cannot prove safety against someone deliberately tunneling production to loopback or changing workflow code: that is outside this harness's supported use. Use ephemeral GitHub-hosted runners without production network/credential access.

## Local results

| Check | Result |
| --- | --- |
| `python -m scripts.run_isolated_tests` | Exit 0: 138 run, 135 passed, 0 failures/errors, exactly 3 Neon integration skips; 4.642 seconds |
| JWT and authorization regressions | Included in the successful complete suite; synthetic keys/SQLite/mock JWKS only |
| Four new container-guard tests | Passed in the complete suite; missing/invalid opt-ins, fixed host, server identity/nonempty rejection and rollback |
| `python -m pip check` | Exit 0; no broken requirements |
| `pip install --dry-run --no-index -r requirements.txt` | Exit 0; all pinned packages already installed, not a fresh Python install |
| Python source compilation | Exit 0, including the new integration entrypoint and Alembic code |
| Offline Alembic heads/SQL | Exit 0, single head `f83d2a19b506`, synthetic PostgreSQL URL and no connection |
| Unapproved container entrypoint invocation | Exit 1 as expected, rejected before settings/database access |
| Clean `npm ci --offline --no-audit --no-fund` | Exit 0 in a new temporary directory containing only package manifest/lockfile; 692 packages installed from cache |
| Frontend Node tests | 51 passed; 0 failed/skipped/cancelled/todo |
| TypeScript | Exit 0 |
| ESLint | Exit 0; 0 errors, same 4 existing unused-binding warnings |
| Production build with CI synthetic Auth settings | Exit 1; failed Google Fonts connections for Geist, Geist Mono and Inter |
| Workflow validation | YAML parsed with installed js-yaml; three jobs/events/read permission/full SHA structure checked; manually reviewed service contexts and shell execution paths |
| `git diff --check` | Passed |
| Actual container migration/schema/5 tests | BLOCKED locally: no Docker, PostgreSQL or psql executable available; not run |
| Actual GitHub Actions run | NOT RUN; no CI status claimed |
| Hosted signup/OAuth/mail/session/key rotation | NOT RUN; remain staging acceptance gates |

The clean npm install used a disposable temporary directory and did not replace the existing frontend dependencies. Tests/type/lint/build used the existing frontend installation. npm warned about core-js install-script approval; no script policy override was added. Python fresh dependency installation and Ubuntu execution remain CI checks. Local npm/Node and Python versions differ only in future resolved patches from the workflow's selected release lines.

The production build retains the application's three fonts and security settings. Task 2's independent HTTPS probe returned `EACCES`; this rerun again stopped at font fetches. No evidence points to JWT code causing that failure. The workflow's font probe reports status/error, but only a complete exit-zero build establishes success. No provider secrets should be added to overcome a build failure. If a later build attempts a provider call with synthetic settings, inspect whether runtime session fetching was incorrectly made static before changing configuration. Full page generation with the synthetic provider is still unverified because compilation stops earlier.

The YAML check is not actionlint or GitHub's server-side workflow validator; those tools were not available locally. The first GitHub run must validate action availability, service-image retrieval, Linux dependency installs, migration execution, metadata comparison and all job steps. Any failure is evidence to investigate, not an expected green result.

## Required GitHub configuration and next steps

Enable Actions for this repository with the three pinned official actions allowed and use GitHub-hosted Ubuntu runners. No repository/environment secrets, Neon credentials, production database URL or elevated token permissions are required. Keep workflow approval for external contributors. Review this diff, then commit/push only when separately authorized; this task did neither. After the first real run, retain its run URL, commit SHA and individual step results. Only then consider requiring `Frontend checks`, `Backend isolated checks` and `PostgreSQL migrated integration` in branch protection.

Allow approved runner HTTPS access to registries, GitHub action/tool downloads, Docker Hub and Google Fonts. Investigate font connectivity there without disabling TLS, weakening CSP or changing the design. Investigate any real migration/schema differences before making database/model changes; no reconciliation migration was invented without PostgreSQL evidence. Do not connect the new harness to Neon to work around a service failure.

Update this report with actual CI evidence after all three jobs run. Production readiness still requires the hosted acceptance checklist in the release-readiness report. The immediate outcome is a local, reviewable CI proposal with tested isolated safety controls; it is not proof of green CI, PostgreSQL coverage or deployment readiness.
