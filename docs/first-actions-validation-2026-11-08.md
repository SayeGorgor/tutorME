# First GitHub Actions validation preparation — November 8, 2026

**Prepared locally for publication review. No commit, push, PR creation, workflow dispatch, merge or deployment occurred.** Actual GitHub job results remain NOT RUN. The local review branch and [PR draft](pull-request-auth-ci-hardening.md) are ready for separate authorization.

## Implementation review and narrow fixes

Reviewed the full uncommitted scope: JWT verifier/tests, workflow, container guard, isolated runner, migrated integration runner, Alembic hook, README and Task 1–3/testing documentation. Changes remain limited to authentication hardening, test/CI infrastructure and related documentation. Existing application authorization, fonts/CSP, dependency manifests, environment files, migrations and Neon protected-target guard/harness were preserved. No unrelated local work was discarded.

Two preparation findings were fixed:

1. Actionlint rejected numeric indexing of the service-port object. Changed `job.services.postgres.ports[5432]` to `job.services.postgres.ports['5432']`; actionlint then passed.
2. Task 3's generic supplied-connection hook trusted its caller. Although ordinary CLI migrations never supplied that Python object, a programmatic caller could silently substitute any connection. `env.py` now validates the explicit CI environment, exact fixed service URL (including port/user/database/password/no extra URL options) and read-only server identity plus empty-database requirement before configuring migrations. Unsupported supplied connections fail instead of falling back to the configured database. A normal CLI invocation without that attribute still uses the existing configured-engine path. No production migration guard or target setting was changed.

Added three connection-guard tests and two tests executing the actual Alembic entrypoint with mocked connections: ordinary CLI uses the configured engine, and a generic unapproved connection fails before migration SQL. These do not establish live PostgreSQL success. The supplied path intentionally supports fresh CI upgrades only; programmatic migrations on populated targets must not use it. Arbitrary trusted Python code can modify configuration/source itself, so this is an explicit safety contract rather than a sandbox against malicious code.

Task 4 modifies `.github/workflows/ci.yml`, `backend/alembic/env.py`, `backend/scripts/container_guard.py`, `backend/tests/test_container_guard.py`, `docs/testing.md` and the Task 3 report's follow-up link; adds `backend/tests/test_alembic_connection.py`, this report and `docs/pull-request-auth-ci-hardening.md`. Prior Task 1–3 files remain uncommitted and part of the eventual review diff.

## Authoritative workflow validation

Downloaded the official [actionlint 1.7.12 release](https://github.com/rhysd/actionlint/releases/tag/v1.7.12) through its GitHub asset API after direct release downloads returned HTTP 504. Verified the archive SHA-256 against the digest published in official release metadata before extracting/executing it. Archive digest: `6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9`.

`actionlint.exe .github/workflows/ci.yml` initially exited 1 with the port-key expression error above; the corrected workflow exits **0 with no findings**. This is actionlint validation, not a GitHub-hosted execution. Optional ShellCheck/Pyflakes executables were unavailable; no claim of their checks is made. Reproduce with the official version and command on an approved builder; do not download/execute an unchecked replacement.

The three jobs retain reviewed SHA-pinned official actions, `contents: read`, checkout credential persistence disabled, no secret/environment references, no privileged PR event and fresh GitHub-hosted runners. Dependencies install using synthetic configuration. PR code executes only in those ephemeral jobs, so repository fork-approval policy still matters. The PostgreSQL job connects only to its own service through the fixed independent guard; Neon exclusions are untouched. The explicit image tag is still not digest-pinned, as documented in Task 3.

Build failures fail the job. Isolated tests enforce the exact three intentional Neon skips; the container runner requires five tests and zero skips. Job summaries describe evidence boundaries rather than declaring success unconditionally. Isolated HTTP/cryptographic tests, container service-level authorization/races and hosted acceptance remain distinct. No production credentials are needed to install dependencies or run the proposed jobs. Actual clean Linux installs/build completion still require CI evidence.

## Branch and remote review

Initial local branch: `master` at `d086d85`, tracking `origin/master`. The shell's sandboxed network request failed; an approved read-only remote check/fetch succeeded. Fetched `origin/master` at **`29353753b393b4cd7444b4dfaced645a6a012911`**. The only newer commit, `2935375`, removes 54 lines of local-run instructions from `frontend/README.md`; it does not overlap this task's files. Its change was reviewed before branch preparation.

Created local **`security/tutorme-auth-ci-hardening`** from that fetched remote tip using `git -c branch.autoSetupMerge=false switch -c ... origin/master`. All prior uncommitted changes followed the switch. Local `master` remains unchanged at `d086d85`; no reset, rebase or merge occurred. The new branch has no upstream yet, deliberately avoiding tracking remote master as a publish destination. HEAD and the fetched origin/master tip are equal (ahead/behind 0/0); all proposed changes are still in the working tree, not a commit. Remote state is a point-in-time check, not a promise it cannot change before publication.

Before any later authorized publication, recheck remote state and the exact approved file list, commit only that scope, and use an explicit push destination for the named branch. Do not force-push, overwrite a pre-existing remote branch, or merge into master. A normal push will trigger the workflow automatically; no separate dispatch is needed. Creating a GitHub PR also needs its own approval. The [local draft](pull-request-auth-ci-hardening.md) is not a published PR.

## Verification evidence

| Check | Task 4 result |
| --- | --- |
| Full isolated backend suite | 143 run: **140 passed**, 0 failures/errors, exactly 3 expected Neon skips; 3.655 seconds |
| New migration-connection regression tests | Five added across two files; passed in the full suite, no database access |
| Python compilation | Passed after the safety changes |
| Offline Alembic SQL and heads | Passed; single head `f83d2a19b506`, synthetic PostgreSQL URL, no database connection |
| Actionlint 1.7.12 | Exit 0 after string port-key correction |
| `git diff --check` | Passed |
| Neon guard/harness and dependency manifests | Unchanged against fetched base |
| Frontend tests/type/lint/clean install | Prior Task 3 evidence retained (51 passed/type pass/lint four warnings/clean offline install pass); no frontend code/dependencies changed, not rerun in Task 4 |
| Production build | Prior Task 3 font network blocker remains; not rerun in Task 4 |
| Container PostgreSQL and hosted acceptance | Not run; local Docker/PostgreSQL and authorized staging unavailable |
| GitHub Actions | Not run; branch is local and uncommitted |

No fresh production readiness claim follows from these checks. The [release gates](auth-release-readiness-2026-11-08.md) still apply.

## First-run evidence plan, after separate publication authorization

Do not fill missing fields with local test results. Record actual per-job totals, all failures/skips and redacted error categories from the selected run. A PR run may test GitHub's generated merge SHA rather than branch head; capture both and verify their relationship.

| Required job | Run URL | Tested commit SHA | Actual result/totals/skips | Error category |
| --- | --- | --- | --- | --- |
| Frontend checks | NOT RUN | No published commit | NOT RUN; expect 51 Node tests, then types/lint/full build | Pending |
| Backend isolated checks | NOT RUN | No published commit | NOT RUN; current expectation 140 pass/3 specified Neon skips | Pending |
| PostgreSQL migrated integration | NOT RUN | No published commit | NOT RUN; real migrations/revision and 5 tests required, 0 skips | Pending |

1. Identify the push or PR workflow run for the authorized SHA and record its URL, event, head SHA and tested/merge SHA. Do not substitute a previous green run. Review the three named jobs independently.
2. Frontend: verify clean installation, actual Node totals, TypeScript and lint outcomes, and full Next.js build completion. Record existing warnings separately. Diagnose font transport/TLS/registry categories without weakening TLS or fonts. If provider access is unexpectedly attempted at build time, review static versus runtime behavior rather than inserting secrets.
3. Backend: record install/pip-check/compilation/offline-migration results and actual test totals. Verify JWT and ownership tests ran. The three explicitly named Neon concurrency skips are intentional here, not PostgreSQL success.
4. PostgreSQL: confirm service bootstrap, identity/emptiness checks, actual Alembic migration head and schema comparison, five executed tests, one-success/one-conflict race expectations, valid/invalid role/access results, and service teardown. Any migration/model incompatibility is a failure to investigate, not something to stamp, allowlist or skip away.
5. For failures, retain only redacted error categories and relevant synthetic stack traces; no token/cookie/environment dumps. Propose the smallest safe fix, run affected local checks, then require a new authorized commit/run for its new SHA. Do not remove guards, weaken verification, suppress migration differences or turn failed tests into skips.
6. Update the results table with real evidence and remaining limitations. Hosted email/OAuth/session/verification/key-rotation acceptance stays blocked until independently authorized staging testing. No deployment or master merge is authorized by a successful CI run.

Publication and PR creation are deliberately pending user authorization; this report records completed local preparation, not an approval to execute them.
