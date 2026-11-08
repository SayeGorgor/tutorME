# Deployment and environment configuration

Frontend/API deploy independently; the overview describes Vercel/Railway. Verify hosting project/root/branch mapping rather than inferring production from local branches. Public instructions need no real environment IDs.

| Scope | Configuration |
| --- | --- |
| Frontend server | `NEON_AUTH_BASE_URL`, server-only `NEON_AUTH_COOKIE_SECRET` |
| Public frontend build | `NEXT_PUBLIC_API_URL`, restricted `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAP_ID` |
| Private backend | `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`, `CSC_LOCATION_API_KEY`, `CSC_API_URL` |
| Backend policy | `LEGAL_OPERATOR_NAME`, `LEGAL_CONTACT_EMAIL`, `LEGAL_EFFECTIVE_DATE`, `LEGAL_PUBLICATION_APPROVED` |
| Backend booking | `BOOKINGS_ENABLED` defaults false and additionally requires policy readiness |

[Settings](../backend/app/core/config.py) defines required fields. Legacy server Maps configuration defaults empty and is not sent to browsers. Frontend/backend Auth and JWKS must match the intended provider branch. Process settings override dotenv. Ignoring recognized disposable-test keys in app dotenv is not test opt-in/approval. Never print private URLs/cookies/tokens or validation inputs.

Review explicit API CORS origins in [main.py](../backend/app/main.py) for each deployment; CORS does not authorize resources. Rebuild frontend public-variable changes and restart API server-setting changes.

## Schema and release order

1. Privately confirm target identity, environment purpose, access scope, retention and backups. An ID alone does not prove disposability.
2. Compare actual revision/schema to [source history](database.md). Old readiness snapshots cannot establish current counts/flags. Do not replay SQL snapshots or stamp mismatches.
3. Review/test migrations on a disposable target; apply approved upgrades before code requiring new fields. Quote columns must precede the newer API/frontend. Check all API instances for mixed-version behavior.
4. Prepare approved independent catalog/subjects and Auth/policy settings. Keep real booking disabled until intended PostgreSQL races and controlled acceptance succeed. Do not relabel users of unknown provenance as demos.
5. Verify hosted runtime/dependency installation, matching Auth origins, assets and unauthenticated browsing. Basic health does not check DB/Auth readiness. Decide default FastAPI docs/OpenAPI exposure and sanitized error-log policy.
6. Separately approve controlled provider/booking operations and enablement. Signup/login can create sessions/send mail. Documentation validation does not authorize production tests.

Store real environment snapshots and incident details privately. Hosted email verification, trusted origins, directory privacy and token-claim requirements remain release checks; source fixes do not prove hosted settings changed. Approved policies/contact are explicit operational decisions, not a legal-compliance guarantee. Minor profiles/bookings, payments, booking email and atomic rescheduling remain outside implemented scope.

## Recovery

Retain database/app backups and prior deployment identifiers privately. Review rollback against additive schema/quote history; the quote migration refuses automatic downgrade. Do not drop quotes to revert UI. Track sanitized failure phases, dependency readiness, quotas and connection budgets without publishing SQL parameters or meeting details. [Location](location.md) covers batch recovery; [testing](testing.md) covers disposable cleanup.
