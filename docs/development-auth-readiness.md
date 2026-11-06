# TutorME development environment and Neon Auth readiness

November 6, 2026 — America/New_York

**A different Neon branch is now configured and is already at migration head. Its purpose/disposable status is unconfirmed. Email verification is optional at the provider but mandatory for TutorME application-user completion. Catalog and tutor-subject assignments are empty. Booking must remain disabled.**

## 1. Inspection scope and environment findings

Reviewed current env settings without printing secrets, installed Auth implementations, registration/booking/location code, importer, test guard and previous reports. Live checks selected only database identity/revision/counts, metadata and explicit nonsecret Auth configuration fields. Every connection used `SET TRANSACTION READ ONLY`, verified `transaction_read_only=on`, set local statement/lock timeouts and rolled back. Sandbox networking required the authorized read-only inspection outside that restriction.

No migrations, imports, seeds, account mutations, signups, verification email requests or concurrency tests ran. Only this report was written. No application source, env file, policy approval or booking flag was changed by this inspection. Earlier test/build results were not rerun or represented as new results.

| Item | Current inspected state |
| --- | --- |
| Project ID | `still-math-23486169` — verified from PostgreSQL |
| Branch ID | `br-odd-cake-axy2uqro` — verified from PostgreSQL |
| Database | `neondb` — verified from PostgreSQL |
| Alembic revision | `e47b901ad682`; matches latest source revision; no migration proposed |
| Endpoint ID | `ep-lucky-resonance-ax8nmonu` |
| Configured DB host | `ep-lucky-resonance-ax8nmonu-pooler.c-4.us-east-2.aws.neon.tech` |
| Backend Auth / JWKS host | Both `ep-lucky-resonance-ax8nmonu.neonauth.c-4.us-east-2.aws.neon.tech` |
| Frontend Auth host | Matches backend Auth host |
| Driver | User changed it during inspection; recheck confirms `postgresql+psycopg` |
| Frontend API origin | `http://localhost:8000` |
| `BOOKINGS_ENABLED` effective setting | **false** |
| `LEGAL_PUBLICATION_APPROVED` | **true**, unchanged |
| Policy readiness / Terms | Computed ready=true; `2026-11-05-v1`; minor profiles=false |
| `service_areas` | **0 rows** |
| `tutor_subjects` | **0 rows** |
| `subjects` catalog | **32 rows**; assignment can use existing approved IDs |
| Concurrency configuration | All six required process variables absent |
| Management access | No Neon management API key found in inspected env configuration; no management calls made |

The current branch differs from the earlier audit's `br-royal-bird-ax5hkimq` / `ep-sparkling-voice-ax3w37ou`. This confirms a separate branch is configured, **not** that it is approved development infrastructure. Project/branch display-name settings returned null. Console names, parent/source, copied account data, default/protected state, retention and disposable approval remain to be established by the owner. We did not inspect personal account records.

Initially the URL selected SQLAlchemy's default PostgreSQL driver, which was unavailable in this environment; the read-only probe temporarily selected installed psycopg in memory. The user's subsequent env correction resolves that driver mismatch. Restart backend processes after configuration changes; an already-running process can retain old settings. Running server configuration/session behavior was not established by these fresh-process checks.

## 2. Actual Auth configuration and compatibility

The branch exposes `neon_auth.project_config`. Inspected only column/key names and allowlisted nonsecret fields; did not select provider secrets, user/session contents, JWTs or private JWKS material.

| Stored setting | Value |
| --- | --- |
| Email/password enabled | true |
| `requireEmailVerification` | **false** |
| `sendVerificationEmailOnSignUp` | **false** |
| `sendVerificationEmailOnSignIn` | **false** |
| `disableSignUp` | false |
| `autoSignInAfterVerification` | true |
| Verification method | `otp` |
| Email provider type | `shared` |
| `allow_localhost` | true |
| Explicit trusted origins | Empty list |

These are stored configuration findings, not proof of mail delivery or end-to-end hosted-service behavior. With these settings, signup does not require verification or automatically send its verification email. TutorME correctly fails closed when the resulting signed identity is unverified. Its explicit **Request verification code** UI offers the supported manual path, but the intended automatic signup-verification experience needs dev Console configuration and controlled acceptance testing.

Installed `@neondatabase/auth` is **0.5.0-beta**, with installed Better Auth **1.6.23**. The SDK adapter includes `jwtClient()` and `emailOTPClient()`. `VerifyEmail` calls `emailOtp.sendVerificationOtp` and `emailOtp.verifyEmail`; this matches the configured OTP method. Current Neon documentation supports codes with a shared email provider; verification links require a custom provider. The app also explains how to use an emailed link, but link redirects have not been tested. [Neon email verification](https://neon.com/docs/auth/guides/email-verification).

Backend signature validation remains EdDSA with the configured Auth origin as issuer/audience and nonempty subject. Completion derives authoritative email from signed `email` and strict boolean verification status; missing claims block completion, mismatched legacy client email/auth ID is rejected. It does not use a privileged provider-user lookup. The installed Better Auth JWT implementation defaults to the session-user payload. Neon's JWT guide documents `email` and `emailVerified`, origin issuer/audience and default EdDSA; custom managed JWT claims are not assumed available. **SDK/source compatibility is established; the actual hosted JWT's claims remain unverified.** [Neon JWT guide](https://neon.com/docs/auth/guides/plugins/jwt).

Recovery handles a missing session by directing the user to verify, sign in again and finish setup. An authenticated identity without `public.users` can complete through `/api/users/complete-registration` with explicit current adult/Terms acknowledgment. Retries preserve existing users and timestamps; no provider identity is deleted. If a verification-required provider returns no session, the completion page's session gate cannot be entered until verification/sign-in succeeds. This is intentional; do not bypass that gate. An interrupted result returned as a provider error still presents recovery links rather than proving whether signup committed. Test the actual SDK response shapes before declaring recovery accepted.

### Origins and callbacks

`lib/auth/server.ts` uses the configured Auth base URL and cookie secret; it does not define a separate trusted-origin list. The Next `/api/auth/[...path]` proxy retains provider origin/session handling. Signup does not set an explicit `callbackURL`; login uses application routing after registration-status checks. Thus no custom callback target has been verified. A verification-link deployment needs an explicit reviewed landing target if provider defaults do not return to the intended page.

Stored localhost allowance supports the local frontend. The backend CORS list separately permits `http://localhost:3000` and `https://tutorme2.vercel.app`; that is **not** the Neon Auth redirect allowlist. No explicit deployed frontend origin is currently stored in this branch's trusted origins. Review the dev branch in Console → Auth → Configuration → Domains and add only the exact approved preview origin if testing beyond localhost. Neon's documentation describes localhost allowance and protocol-qualified domain entries. [Trusted domains](https://neon.com/docs/auth/guides/configure-domains).

### Direct-provider signup

Calls directly to hosted Auth bypass the Next signup acknowledgment precheck and can create an Auth-only identity. Backend completion still requires signed verified email, adult confirmation and current Terms; booking has independent eligibility checks. Provider-directory collection without TutorME acknowledgments remains a privacy/eligibility release decision. No CORS change, email verification toggle or assumed custom hook eliminates it. Current Neon documentation says signup is open by default and restricted signup support is forthcoming. [Authentication flow](https://neon.com/docs/auth/authentication-flow).

## 3. Development environment requirements and Console procedure

First review the **already configured** branch `br-odd-cake-axy2uqro` in project `still-math-23486169`: record its display name, source/parent, data-copy scope, default/protected status and intended owner. Explicitly approve its use for controlled testing if suitable. Do not create another branch just because the current name is unknown.

If unsuitable, the proposed Console procedure is:

1. Select the project → Branches → New branch.
2. Choose the reviewed parent; name the branch `tutorme-dev-e2e` or another approved name. Select **Schema only** when avoiding copied account/Auth data, or **Current data** only with explicit approval of copied personal/session/provider data. Inspect the resulting Auth setup before use. A schema-only branch can omit the Alembic version **row** and subject data even if their tables exist; do not stamp or migrate automatically to compensate. Treat missing history as a separate bootstrap review.
3. Review compute size, suspend settings, branch expiration and cost, then create only after approval. Do not alter the production/default branch.
4. Record project ID, branch ID and database from the selected branch/Connect view. Obtain both pooled application and **unpooled/direct** administrative URLs privately. Confirm actual IDs read-only before any mutation.
5. Open that branch's Auth configuration; enable/review Managed Better Auth, choose the correct DB, and obtain its own Auth/JWKS URLs. Review email provider, credentials, origins and callbacks; clones can inherit Auth configuration and identities. Use a separate dev cookie secret/session configuration.
6. In the selected **dev** Auth settings, enable Sign-up with Email and **Verify at Sign-up**, select codes with the shared provider, and review automatic verification email sending. Confirm the displayed branch before saving. Do not directly UPDATE `neon_auth.project_config`.
7. Align backend DB/Auth/JWKS and frontend Auth/API settings. The driver must remain psycopg; use direct URL for administration/test guard. Keep policy approval unchanged and booking false. Restart dev servers, then repeat read-only identity and flag checks.

Console branch creation and clone behavior are documented by Neon. Branching isolates future writes, but a full clone copies identities, sessions, keys and configuration. [Manage branches](https://neon.com/docs/manage/branches), [branching authentication](https://neon.com/docs/auth/branching-authentication), [schema-only branches](https://neon.com/docs/guides/branching-schema-only).

## 4. Independent Census catalog and subject preparation

Use official **Gazetteer national Places and ZCTA text** files, not TIGER shapefiles, census tracts, Google coordinates, or demographic PLACES datasets. A verified available pair is the 2025 release:

- [2025 national Places ZIP](https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_place_national.zip)
- [2025 national ZCTA ZIP](https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_zcta_national.zip)
- [Official release page](https://www.census.gov/geographies/reference-files/2025/geo/gazetter-file.html) and [directory](https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/).

No dataset was downloaded in this inspection. Extract the official text files, record source URL, retrieval time, vintage, archive/text SHA-256 and headers, and review them before import. `scripts/import_service_areas.py` accepts `--year` **2020–2026 inclusive**; this is a parser range, not proof every annual dataset exists or has been tested. It accepts tab/pipe delimiters and UTF-8 BOM; requires `GEOID`, `INTPTLAT`, `INTPTLONG`, and uses `NAME`/`USPS` where present. Verify header compatibility and actual vintage; `--year` does not validate the file's year.

The importer inserts missing `census-<year>-<kind>-<GEOID>` IDs without overwriting existing coordinates. It records `US Census Gazetteer <year>` as source. Select one approved vintage: mixing years produces different IDs for the same area and can make resolution ambiguous. Census representative points are coarse matching locations, not addresses, driving distances or exact USPS delivery boundaries. The importer labels records US and does not implement a country/territory policy; review the selected national coverage accordingly.

Official Census employee-created data generally has no US copyright restriction; no purchased dataset license or Google license is needed for these independent files. Preserve a source/vintage credit and provenance manifest as project practice. Do not claim Census endorsement or assume third-party material/logos share the data's status. No separate attribution license was identified for these Gazetteer files. [Census research/public-access policy](https://www2.census.gov/foia/ds_policies/ds027.pdf).

Proposed commands from `backend`, **only after dataset and target approval plus read-only preflight**:

```powershell
.venv/Scripts/python.exe -m scripts.import_service_areas 'C:/data/2025_Gaz_place_national.txt' --kind place --year 2025
if ($LASTEXITCODE -ne 0) { throw 'Places import failed; stop.' }
.venv/Scripts/python.exe -m scripts.import_service_areas 'C:/data/2025_Gaz_zcta_national.txt' --kind zcta --year 2025
if ($LASTEXITCODE -ne 0) { throw 'ZCTA import failed; stop.' }
```

Paths are proposed, not verified files. These commands write/commit data and currently have no embedded branch allowlist: independently verify the process `DATABASE_URL` immediately before each. Keep unexpected management/test variables out of backend dotenv because Settings rejects unknown keys. Recount source/year groups read-only afterward.

Subjects: GET `/api/subjects/`, select approved existing IDs, then authenticated PATCH `/api/tutors/user/{own_user_id}` with `{"subjectIds":[<approved_id>]}`. The list **replaces** associations; `[]` clears them. Ownership is checked and unknown IDs fail 422. User ID here differs from tutor profile ID. Availability uses authenticated PUT `/api/tutors/{own_tutor_profile_id}/availability` with an `availability` list; it replaces the existing schedule. Neither operation was called. Test only newly created synthetic tutor profiles, never the legacy profiles.

## 5. Disposable PostgreSQL concurrency plan

All six variables are mandatory in the test process:

| Variable | Source / intended value |
| --- | --- |
| `TUTORME_RUN_POSTGRES_TESTS` | `1` only after explicit live-test approval |
| `TUTORME_TEST_DATABASE_IS_DISPOSABLE` | `1` only after explicit schema create/drop approval |
| `TUTORME_TEST_DATABASE_URL` | Private direct TLS URL from the approved target's Connect view, using `postgresql+psycopg` |
| `TUTORME_TEST_PROJECT_ID` | Independently reviewed Console project ID |
| `TUTORME_TEST_BRANCH_ID` | Independently reviewed disposable branch ID |
| `TUTORME_TEST_DATABASE_NAME` | Reviewed database name from Connect / `current_database()` |

Read-only identifier verification, without any token or connection-string output:

```sql
BEGIN READ ONLY;
SHOW transaction_read_only;
SELECT current_setting('neon.project_id', true),
       current_setting('neon.branch_id', true), current_database();
SELECT version_num FROM public.alembic_version;
ROLLBACK;
```

The guard rejects the previous inspected branch `br-royal-bird-ax5hkimq` and endpoint permanently. It checks expected project/branch/DB against actual server values read-only **before schema creation**, each worker and cleanup; rejects pooled/non-TLS/incorrect-driver targets. The new configured branch is not hard-denied, but that does not approve it as disposable. A wrong nonprotected URL plus deliberately matching approval variables can still authorize the wrong environment: Console/owner review remains essential.

The test creates a random `tutorme_test_<uuid>` schema, ORM tables/enums, synthetic participants/availability/pending bookings, races confirmations, and drops that generated schema with CASCADE. Expected result: one 200, one 409. It uses 5-second connect/lock/barrier limits, 15-second statement/idle-transaction limits, a shared 30-second worker deadline, and worker termination before cleanup. Confirmation flags are patched inside workers; they do not enable the running app.

Residual risks: schema privileges and compute cost; remote work may outlive local process termination briefly; network errors can prevent cleanup; a cleanup exception can obscure the first failure. Inspect remaining test schemas read-only, and obtain separate approval before any manual drop. Never substitute a shared schema. `create_all` does not validate Alembic history or prove protection from arbitrary SQL writers.

After separately approving target/write scope, privately supply the URL and set the five nonsecret settings in a temporary process session, then run from `backend`:

```powershell
.venv/Scripts/python.exe -m unittest discover -s tests -p test_postgres_booking_concurrency.py -v
```

**Not executed.** Keep the six settings out of dotenv and remove/close the temporary session afterward.

## 6. Ordered end-to-end acceptance sequence

Use controlled adult synthetic identities: T1 tutor, S1/S2 self-managed students, and G1 adult guardian only if needed. Email aliases must deliver to an approved mailbox controlled by the tester; `.invalid`/`.test` cannot prove real email delivery. Never reuse genuine tutor accounts or copy production tokens. Retain only pass/fail evidence and nonsecret test IDs; do not export browser network traces containing credentials or tokens.

| Order | Concrete test / expected result | Effects requiring approval |
| --- | --- | --- |
| 1 | Verify Console identity/purpose, fresh-process flags, DB/Auth alignment, revision and startup; ready=true, booking=false. Confirm exact trusted dev origin and Google restrictions. | Read-only; configuration saves/restarts separately reviewed |
| 2 | On approved dev Auth, enable/review OTP verification. Register T1/S1 through tutor/student pages with explicit adult/current Terms fields. Withhold code initially: no authoritative app account until verification. Missing/false/nonboolean acknowledgments, stale Terms and admin role reject. | Provider identity/session/verification records; delivery of signup email |
| 3 | Request/resend controlled code; wrong/expired code fails, valid code succeeds; sign in again. Backend validates claims through normal requests. Record only claim-presence/type and pass/fail, never raw JWT. Confirm app account email comes from provider; mismatched client identity/email fails. | Provider verification/session writes, email; application-user/profile creation on completion |
| 4 | Interrupt only the application's completion request after provider success (browser offline/request blocking). Restore network, login, enter Finish setup and explicitly accept Terms. Retry twice; one app user/profile and unchanged first acceptance timestamps. Repeat with verified Auth-only identity and no immediate signup session. Different-role completion conflicts. | Controlled identity/app-user writes; no database corruption or deliberate destructive failure injection |
| 5 | Using an approved pre-existing synthetic incomplete account, login and accept current Terms/adult eligibility in Account settings. Confirm new explicit time/version/purpose; genuine historical users remain untouched. Guardian cannot create minor profiles/bookings. | Synthetic account acknowledgment update; fixture preparation needs approval |
| 6 | T1 GET subjects, assign approved IDs through own profile; outsider denied; unknown ID fails. Set future half-hour availability with an IANA time zone; verify roundtrip. Note PUT replaces schedule. | Tutor association/profile/availability writes |
| 7 | Before import, Google selection returns clear catalog-unavailable error; online search works. After approved import, select an exact city/state and ZIP, restore filters and verify independent area ID. Unsupported/ambiguous entries fail clearly. No per-keystroke `/areas?q=` calls; attribution visible in light/dark/mobile; no restricted Google data persisted. | Import is a separate DB write; Google API requests can incur usage cost; saving T1's location is a profile write |
| 8 | With global booking still false, direct create/confirm attempts reject. Run approved disposable PostgreSQL race independently and inspect schema cleanup. | Race creates/inserts/drops its test schema; false-flag API requests should not create bookings |
| 9 | **Stop until separate DEV-ONLY enablement approval.** Then request a future available one-hour online slot as S1; pending is accurate, tutor accepts, participant-only meeting details stay private. Cancel a future request/confirmation; historical state remains. Complete only an ended approved fixture. | Dev flag change/restart plus booking/status/private-detail writes; no payment or booking-email integration |
| 10 | Retry exact key/payload; same booking. Changed key payload/mode conflicts; another pending format at same time conflicts explicitly. Reconfirm after availability changes and race overlapping requests: only one confirmation; test student conflicts across tutors, outsider denial, timezone/DST and invalid boundaries. | Synthetic booking/availability writes |
| 11 | Inspect approved synthetic demo fixture: labels on public surfaces, direct slots/create/confirm denied. If no demo fixture exists, defer: creating one requires a separate explicit fixture operation, not legacy reclassification or a seed run. | Fixture creation if approved; blocked attempts should not create genuine bookings |
| 12 | S2 submits own deletion request twice: one pending record, no deletion; outsiders cannot access it. Pending/under_review blocks requests and confirmations; rejected/processed/completed no longer blocks solely for history, resubmit conflicts preserving old record. Cancellation/history stay accessible. | Deletion-request writes; lifecycle transitions require separately approved synthetic fixture changes because no operator processing endpoint exists |
| 13 | Restore any approved dev-only booking enablement to false, restart, verify flags and inspect test outcomes/counts read-only. Preserve evidence; no automatic account or schema cleanup outside the test's own schema. | Dev flag restoration; any identity deletion/data cleanup needs a separate approval |

Actual hosted JWT verification, mail delivery and provider response/session behavior require the controlled live signup in steps 2–4. **Approval has not been given; that test stops here.** No token is requested from the user.

## 7. Exact operations awaiting approval

1. Confirm `br-odd-cake-axy2uqro` is suitable for dev mutations, with approved copied-data scope; or approve the Console branch-creation procedure, source, expiration and compute cost above. Neither is currently disposable by inference.
2. Save dev-only Auth verification/sending/origin/callback settings and change dev connection/session configuration if needed. User's psycopg driver correction is already confirmed; no further driver edit is proposed.
3. Download/extract/review the two official archives locally; separately approve the two importer commands and exact target/vintage. Downloads alone do not approve imports.
4. Create the named controlled test identities and send verification mail; run the specific registration/completion/acknowledgment/profile/availability/deletion API mutations in the ordered table. This includes normal provider session writes during sign-in.
5. Supply all six disposable test settings and run the single PostgreSQL unittest command; approve its synthetic inserts and generated-schema CASCADE cleanup.
6. Later, independently approve temporary **dev-only** booking enablement and steps 9–10, followed by restoration to false. This report does not authorize that flag change.
7. Any synthetic demo/lifecycle/ended-booking fixture preparation or leftover-schema cleanup must name its exact target and records separately. No seed, legacy-profile update, account deletion, migration, stamp/reset, production change, or policy approval change is included.

The immediate blockers are owner confirmation of environment purpose, dev verification/mail configuration and actual claim acceptance, approved catalog import/subject assignments, and successful disposable PostgreSQL isolation/concurrency testing. Provider-level signup privacy remains a release decision. **This report ends the inspection: booking is false and no database-changing operation has begun.**
