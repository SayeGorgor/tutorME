# TutorME account safety and booking implementation

## Initial audit
Next.js 16.4.5 App Router/React 19/TypeScript/Tailwind frontend and FastAPI/SQLAlchemy/PostgreSQL backend are retained. Neon Auth email sessions and EdDSA JWT/JWKS auth are reused. SQLAlchemy models and Alembic linear migrations exist; current source head is c21a76e9d304 (location migration remains unapplied by this agent).

Existing functionality: student/tutor signup and profile creation; public tutor discovery with subject/price/mode/geographic filters; owned profile/location/availability writes; weekly/custom local minute ranges with IANA timezone; official Google Places widget and Google map. City/ZIP selection resolves to independent Census service areas. No per-keystroke local autocomplete requests remain, but exact resolution and saved-filter lookup still require service_areas and imported catalog data.

Missing: legal routes, policy acknowledgment, adult eligibility, parent profiles, bookings/status/concurrency, deletion requests, notification infrastructure. Dashboards and UpcomingSessionsCard contain fictitious sessions/statistics. The seed script creates template profiles for IDs 11/12/14/15, without proof those users are fictional. No existing records will be retroactively marked as demos. There are no payments, email delivery or meeting links.

Reuse: shared auth/provider, API helper, existing user/tutor/availability/subject/service-area models, blue theme and layouts. Required additive schema: nullable adult attestation/terms acceptance and account purpose on users; explicit is_demo on tutors; bookings and deletion requests. Existing users keep null acceptance records, not invented consent. New booking use requires a current adult/terms acknowledgment, including existing users.

Safety choices: operator/legal configuration gates registration and real booking; missing verified contact will produce visibly draft policy pages. Parent/guardian accounts may register, but real minor-profile collection and minor bookings remain disabled pending safeguards and reviewed parental workflows. Genuine self-managed adult bookings use manual tutor approval, UTC timestamps, participant ownership, tutor/participant row locks, idempotency and current-availability checks. No payment provider or external email service will be added. PostgreSQL concurrency needs development-branch integration validation; no migration, extension or seed writes will run against any configured DB.

Implementation results, test evidence and operator setup will be appended as phases complete.


## Phase results

| Phase | Status | Result |
| --- | --- | --- |
| 0 Audit | Completed in source | Existing architecture reused. No live schema inspection or migration application was attempted for this task. Earlier location audit could not connect to the configured DB. |
| 1 Legal pages | Implemented and HTTP-verified; publication intentionally pending | Public `/terms` and `/privacy`, shared footer, signup and account links, responsive light/dark styles, draft/ready state, Google legal references. Operator-approved hosting/retention practices and publication flag still required. |
| 2 Eligibility | Implemented and isolated-test verified; parent management partial | Adult/Terms strict-boolean self-attestation, purpose and version/timestamps; application registration JWT ownership; Next signup proxy precheck; existing-user acknowledgment. Guardian purpose may register, but child profiles/credentials and minor appointments are disabled. |
| 3 Demo tutors | Implemented and isolated-test verified | Explicit `is_demo=false` default, labels in results/profile/map, backend slot/request/confirmation restrictions. New opt-in reserved-namespace fictional seeds are idempotent. No legacy users reclassified. |
| 4 Booking | Implemented and isolated-test verified; live PostgreSQL verification pending | One-hour requests, current availability, UTC/DST checks, pending/confirmed/declined/cancelled/completed transitions, participant locks and idempotency, private meeting details, real dashboard/history. Operator enablement default false. |
| 5 Places | Preserved; browser acceptance pending | Existing official widget/branding, no per-keystroke `/areas?q=` calls. Exact `/resolve` and `/areas/{id}` still require the prior location migration and Census import. No permanent Google geographic dataset. |
| 6 Deletion | Authenticated request workflow completed | Owned, idempotent status/request endpoints and Account settings. Manual processing only; identities and appointment records are not automatically deleted. |
| 7 Disclosure | Completed | Shared, small portfolio footer on public and authenticated routes, separate from hero/legal text. |
| 8 Migrations | Generated and offline SQL checked; unapplied | `e47b901ad682_account_safety_bookings.py`, after `c21a76e9d304`. Review SQL in `docs/account-booking-migration.sql`. No DB migration or seed run. |
| 9 Verification | Partial | Automated and public HTTP checks below pass. Disposable PostgreSQL race test is present but skipped without explicit configuration. Live Neon signup, browser/Maps acceptance and minor safeguards are not claimed. |
| 10 Report | Completed | This document records changes, validation and manual operation. |

## Policy configuration and verified contact
The user supplied **Saye Gorgor** and **tutormebot@gmail.com** as the verified operator/contact. Only these nonsecret values and the effective date **2026-11-05** were added to the existing ignored backend `.env`; all pre-existing secret values were preserved and never printed. The effective date is a proposed policy date until publication approval. The public pages fetch policy metadata from the backend; if it is unreachable or not yet deployed they show an explicit draft fallback, not invented contact data.

Backend configuration:

```dotenv
LEGAL_OPERATOR_NAME=Saye Gorgor
LEGAL_CONTACT_EMAIL=tutormebot@gmail.com
LEGAL_EFFECTIVE_DATE=2026-11-05
LEGAL_PUBLICATION_APPROVED=false
BOOKINGS_ENABLED=false
```

After reviewing the concrete documents and actual deployment practices, the operator may set `LEGAL_PUBLICATION_APPROVED=true`. This is not a declaration of legal compliance. Real appointments additionally require `BOOKINGS_ENABLED=true`, only after migration, database concurrency and acceptance testing. These flags default false and were not enabled by the agent. Existing login and read access are not intentionally gated on new policy acceptance. Current Terms version is `2026-11-05-v1`; changes to the operative Terms require deliberate versioning and renewed acceptance. New user records get actual acceptance timestamps; existing users remain null until they expressly acknowledge through Account settings.

## Registration/security behavior
- Student self / guardian and tutor signup use the existing shared form and Neon Auth. Explicit adult age and Terms checkboxes are required. No full DOB is collected; nothing claims verified age or parental identity.
- The Next auth signup proxy checks eligibility with FastAPI before forwarding email signup to the existing provider. Provider origin/session/CSRF handling remains intact. The existing Better Auth client proxy forwards additional signup body fields; this was checked in installed source. Live Neon end-to-end registration remains unverified.
- Backend `POST /api/users/` now requires a valid Neon identity. The supplied auth ID must equal the signed token subject, and email must match if the token contains an email claim. Client-selected admin roles are forbidden. Existing accounts are not overwritten. When an email claim is absent, this is not an independent email-verification claim; provider verification settings still require review.
- Raw direct requests to the public Neon provider URL can be outside the application's proxy gate. Review provider-side signup restrictions/hooks before publicly enabling registration if the operator needs the provider identity directory itself to enforce the same eligibility workflow. Such a raw identity does not bypass the application's authenticated, adult-attested user creation requirements.
- Minor profiles, child-specific fields, minor logins, child messaging and guardian booking remain disabled. Guardian-purpose accounts cannot create or confirm appointments for minors. Changing purpose to self is an adult self-attestation, not verified guardian status. COPPA applicability and safeguards require independent review; an age checkbox does not establish compliance.
- Public tutor responses now omit email and eligibility/acceptance data. Private account and appointment endpoints enforce identity/participant ownership. Existing CORS origins and authentication infrastructure were preserved. No security rule was disabled and no external communication provider was added.

## Booking behavior and limits
- Supported appointment duration: **60 minutes**, starting on the tutor's existing half-hour availability boundaries, within the next 30 days. Student display uses device time zone; API instants and PostgreSQL columns use timezone-aware UTC.
- Weekly rows use Sunday=0; custom rows use ISO calendar dates; IANA zones are validated. Nonexistent or ambiguous DST boundary/start/end wall-clock times are excluded rather than silently normalized. Existing malformed availability is ignored for bookability; new availability requests are validated.
- Public slot lookup discloses available times only, not booking identities or private meeting details. An open slot is an option for a pending request, not a confirmed reservation. Availability and conflicts are rechecked at request and confirmation time.
- Pending requests may overlap; only one overlapping request can become confirmed. Request submission uses a per-student idempotency key and returns the same record for retries with the same payload. Reusing the key for a different payload fails. A cap of 20 pending requests per account limits request accumulation.
- In PostgreSQL, mutations lock participant user rows in sorted order and the tutor profile row before checking/writing. Confirmation refreshes the booking after locks. Availability replacement shares the tutor row lock. These are application-path concurrency controls, not an exclusion constraint against arbitrary direct SQL writes. The optional race test must be run on a disposable PostgreSQL DB before enablement; SQLite does not prove row-lock behavior.
- Only the booked tutor can accept/decline pending requests. Either participant may cancel a future pending/confirmed appointment. Only the tutor can mark an ended confirmed appointment completed. A past pending request does not become confirmed automatically. No automatic expiry or completion job exists.
- Rescheduling is cancellation plus a new pending request and tutor approval; there is no atomic reschedule endpoint. The UI and Terms state this supported rule.
- A tutor can supply an HTTPS meeting URL for a confirmed online appointment or explicitly acknowledge an approved public in-person venue. These details are private to authorized participants and not included in tutor search/map payloads. TutorME does not invent meeting links or send emails. Arbitrary meeting URLs are displayed as text, not executed or fetched by the server.
- Existing users, including tutors, must explicitly attest adulthood and accept current Terms before new requests/confirmations. This does not fabricate earlier consent or invalidate their Neon sessions. Guardian bookings are blocked.
- No payments are collected and no gateway, webhook, checkout or payment secret was introduced. Existing payment placeholder now accurately explains external arrangements; fake earnings/session metrics and the sample upcoming appointment were removed.

## Demo seed provenance
The former script wrote template profiles for user IDs 11, 12, 14 and 15. Neither the source nor database establishes those identities as fictional. No migration marks them as demos and no account is overwritten. Existing unacknowledged accounts cannot receive new confirmed appointments until an authenticated owner explicitly completes eligibility.

The revised seed creates only new fictional `demo:seed-v1:*` identities with `example.invalid` emails, explicit demo flags, fictional names/descriptions, and no real auth credentials. It creates no availability, locations or bookings. Default seed execution imports only subjects; fictional tutors require explicit `--include-demo-tutors`. Repeated runs preserve existing records. A reserved demo identifier unexpectedly associated with a nondemo profile raises an error rather than reclassifying it.

## Deletion-request runbook
1. A signed-in user submits `/api/users/me/deletion-request` from `/account/settings`; the endpoint accepts no target user ID and cannot request another account's deletion. Duplicates return the current request status. A pending request pauses new bookings for that requesting student.
2. An authorized operator must inspect pending requests through a trusted administrative DB workflow. No admin endpoint or automatic background processor is exposed by this implementation. The user can also contact the verified privacy address.
3. Before any deletion, verify the requester as appropriate for the action, review genuine future appointments and participant interests, preserve records only where justified, and determine applicable retention/security obligations. Do not delete another participant's information, silently cascade appointment history, or assume every record must be retained indefinitely.
4. Review separate Neon Auth identity/session deletion and app-data actions together. The agent supplies no destructive deletion script. Record the actual operator decision/status using reviewed administrative procedures. Do not promise a retention period or processing deadline that has not been adopted.
5. Configure a real notification/review process before public operation; the app records requests but sends no request emails automatically.

## Manual database and deployment steps
No migration, seed or destructive operation was executed against any configured DB, and no development branch was inferred.

1. Select and explicitly confirm a disposable/development Neon branch, target DB and migration scope. Review current `alembic_version` and repository chain. Back up and plan rollback before any later production rollout.
2. From `backend`, after that confirmation, apply the reviewed schema using `.venv/Scripts/python.exe -m alembic upgrade head`. Review both pending migrations if the location revision has not yet been deployed. The new revision adds nullable user acknowledgments, `is_demo=false`, bookings with restrictive participant FKs/checks/indexes and deletion requests. It does not insert acceptance data or seed profiles. Automatic downgrade is blocked to avoid data loss.
3. For in-person geographic matching, follow the independent Census import steps in `docs/location-integration.md`. The `service_areas` relation remains necessary for matching and exact selected-place resolution, not as an obsolete custom autocomplete table. Missing-table deployment errors require applying the location migration to the intended DB; they are not fixed by deleting matching infrastructure.
4. Optionally seed explicitly fictional demo tutors only on the approved environment: `.venv/Scripts/python.exe -m scripts.seed --include-demo-tutors`. The agent did not run it against the configured DB.
5. Configure policy fields and review actual deployment/hosting/logging/retention practices before setting publication approval. Review Neon raw-provider signup restrictions, email verification and session settings. Keep browser Google keys restricted and native attribution visible. No credentials are included in this report.
6. To exercise PostgreSQL concurrency, explicitly point `TUTORME_TEST_DATABASE_URL` at a disposable database and set `TUTORME_TEST_DATABASE_IS_DISPOSABLE=1`, then run `.venv/Scripts/python.exe -m unittest discover -s tests -p test_postgres_booking_concurrency.py -v`. This opt-in test creates/drops a unique `tutorme_test_*` schema, never uses DATABASE_URL implicitly, and must not target production. It is currently skipped.
7. Deploy backend before frontend schema consumers. Confirm public `/api/policies`, `/terms`, `/privacy`, signup acknowledgments, test adult registration, existing-user acknowledgment, genuine and demo booking behavior, and private meeting details. Then deliberately enable real booking. No live appointments were created by this task.

## Files created/modified for this task
Backend: `app/core/config.py`; `app/actions/actions.py`; `app/models/user.py`, `tutor_profile.py`, `booking.py`, `__init__.py`; `app/schemas/user.py`, `tutor.py`, `tutor_availability.py`, `booking.py`; `app/services/policies.py`, `bookings.py`; `app/routes/api.py`, `users.py`, `tutors.py`, `sessions.py`, `policies.py`; `scripts/seed.py`; additive migration `alembic/versions/e47b901ad682_account_safety_bookings.py`; tests `test_locations.py`, `test_marketplace.py`, `test_postgres_booking_concurrency.py`. Ignored backend `.env` contains only the three additional verified legal fields.

Frontend: public `(landing)/terms` and `/privacy`; protected `/account/settings`, student shared layout/sessions and tutor sessions/dashboard/students/payments screens; auth catch-all signup gate; shared root footer; `LegalDocument`, `SiteFooter`, `AccountSettings`, `BookingRequest`, `BookingList`, `SignupForm`, `UpcomingSessionsCard`, `TutorCard`, `TutorMap`, tutor/student navigation and auth sizing; `lib/policies.ts`, `lib/api/authorized.ts`, user/profile types and signup API helper. Tutor public/profile views show real/demo and rate information; dummy rating/session claims were removed where touched. Existing Google widget and styling remain intact. Pre-existing user/package/design/location edits were preserved.

## Test evidence
- Backend unittest discovery: **43 passing, 1 skipped** (44 total). Includes prior geographic tests plus adult/Terms/identity/role enforcement, guardian registration and guardian booking refusal, nullable existing-user acknowledgment, pending/confirm/decline/cancel/complete rules, sequential overlap prevention, idempotency misuse, UTC offsets/DST, private meeting authorization, demo API guards, seed idempotency, public email exclusion and owned non-destructive deletion requests. No email is sent; data lives only in isolated synthetic SQLite fixtures.
- Optional real PostgreSQL simultaneous-confirmation test is **not run**, pending an explicitly configured disposable target. Do not describe SQLite tests as proof of production concurrency.
- Frontend full ESLint: **0 errors, 13 existing unused-variable warnings** in tutor profile/UserContext. No lint or security rules disabled. Old dashboard apostrophe errors disappeared with real dashboard replacement, and old explicit-any catch code in the signup API helper was removed.
- Next route type generation and TypeScript check: pass after synchronizing generated route types for new layouts. An initial stale generated-layout error was resolved by the supported typegen command, not by disabling checking.
- Production build: pass, including dynamic public legal routes, account/settings and new session routes.
- Built-in Node Google loader tests: **4 passing**, with the existing harmless module-type warning. No library dependencies were added.
- Local production-server HTTP checks: `/terms`, `/privacy`, `/signup`, `/signup/tutor` all return 200 without authentication and contain Terms/Privacy links; legal pages contain Google Maps terms and privacy links and an appropriate draft/active state. This is HTTP markup verification, not a browser screenshot/interaction test.
- Offline Alembic SQL generated for `c21a76e9d304:e47b901ad682`; source head verified. No SQL was executed. `git diff --check` checked before handoff.

## Remaining limits and required review
- Policies are tailored drafts until operator approval. Verified contact is configured, but deployment provider/region, logs, retention/deletion operations, consumer obligations and minor-related obligations require review. No governing jurisdiction, business address, commercial entity, age verification or COPPA-compliance claim was invented. Official Google references and FTC guidance informed this review; policy pages alone do not establish legal compliance.
- Minor profiles and guardian bookings are deliberately deferred. No private child information is collected by a new endpoint, so parent-to-parent access cannot expose such profiles; it is not claimed that a completed parent-management system exists.
- Live DB migration, PostgreSQL concurrency, real Neon identity/session flow, actual operator publication and Google UI/browser checks remain unverified. Real booking remains disabled by default until these are reviewed. No production data or auth identity was changed.
- Booking notifications are in-app states only. No email, messaging, calendar invites, video-call creation, payment processing, automated completion/expiry, recurring bookings or atomic reschedule are implemented.
- No browser-control environment was available to verify real Maps attribution, mobile typography or light/dark screenshots. Existing native attribution and CSS protections were preserved; manual acceptance is still needed.
- No deletion worker/admin console is included. Requests require operator review and a dependency-aware plan; no unsupported promise of automatic erasure or fixed retention period is made.

## Primary references
- [Google Places policies and attribution](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Google Maps End User Additional Terms](https://maps.google.com/help/terms_maps/)
- [Google Privacy Policy](https://policies.google.com/privacy)
- [FTC COPPA guidance and amended-rule pointer](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)
- [PostgreSQL row-level locking](https://www.postgresql.org/docs/current/explicit-locking.html)


## Operator publication approval - November 6, 2026
The operator reviewed and approved the legal documents for use in this conversation. `LEGAL_PUBLICATION_APPROVED=true` has been set in the local backend configuration. This removes the policy-publication gate when the configured backend reloads; it does not certify legal compliance, apply migrations, or enable real booking. `BOOKINGS_ENABLED` was not changed. Deployment environments must receive the approved policy configuration separately.
