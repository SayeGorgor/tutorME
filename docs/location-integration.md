> Current UI update: Google PlaceAutocompleteElement is now the primary location input, shown directly in all location fields. The custom city/ZIP input, suggestion list, and Google-search toggle have been removed. Selection performs one POST `/api/locations/resolve` to map the selected city/state or ZIP to the independent service-area catalog; it updates the existing areaId filter automatically. No `/api/locations/areas?q=...` calls remain in the frontend. `/areas/{id}` is retained to restore saved filters, and the legacy catalog endpoints/database/importer remain intact. Unsupported or ambiguous matches are rejected rather than guessed. There is no custom fallback when Google is unavailable; online-only discovery remains usable. Native Google branding is untouched, with explicit light/dark color-scheme on the widget host. Live branding/keyboard screenshots remain unverified.

# Hybrid tutoring: audit and implementation

## Initial audit (before implementation)
- Next.js 16.4.5 App Router, React 19, TypeScript, Tailwind 4. `frontend/app` contains landing, public tutor, and protected tutor/student routes. Shared UI in components; auth, API wrappers and context in lib.
- FastAPI routes under `/api`, synchronous SQLAlchemy sessions, PostgreSQL configured through Pydantic `.env` settings. Alembic linear migration head is `81099c270fbc`. No PostGIS dependency or spatial schema in repository. Neon JWT/JWKS validation maps auth subject to users.auth_id; Next server layout checks sessions.
- Signup creates an application user; tutors also get an empty profile with one shared hourly rate. Profile editor saves introduction, biography and availability. Existing profile/availability writes lack ownership checks.
- Availability rows represent weekly day or custom date and integer minutes plus timezone. There is no booking model, reservation API, confirmed-slot calculation or functional sessions route. Registration does not imply bookability.
- Tutor discovery fetches every profile. Subject/location parameters and price/distance/language widgets do not filter the API. Subjects have a catalog but no tutor association. Ratings, distance, verification and several subject labels are sample values.
- Existing location route proxies CSC autocomplete; client calls are commented out. Landing uses a hardcoded Atlanta location, cards a fixed distance, map a placeholder. No Google integration exists.
- Frontend env conventions: NEXT_PUBLIC_API_URL, Neon server URL/cookie secret, and browser Google key/map ID names already present. Backend has DB, Neon, CSC and an unused Google key. Values were not printed. No automated tests found; frontend offers lint/type/build tooling.

## Proposed architecture and safety
- Add independent `service_areas` Census city/ZCTA representative points; tutors select an existing area and explicitly consent to public approximate display. Do not store homes or Google coordinates. Google widget requests addressComponents only and uses them transiently to suggest an independent catalog search; user confirms the Census area. Only optional Place ID is retained.
- Add tutor mode flags (existing tutors online=true, in-person=false), area foreign key, travel miles, optional user-written meeting preferences and Place ID. Keep existing rate. Add tutor-subject association to make existing subject search functional.
- Use SQL great-circle distance with bounded latitude prefilter, server pagination and eager loading. Both student radius and tutor travel limits apply. No driving-distance or booking claims. PostGIS enablement will be checked read-only if reachable; no extension or migration is applied automatically.
- Reusable lazy Places widget, independent area picker, location preference form and lazy map. List mode never imports Maps/marker libraries. Public markers use Census points only; co-located tutors grouped in one area marker.
- Existing CSC route retained for compatibility. Search API retains its array response and adds query parameters and limit/offset. Add paginated envelope endpoint for new discovery UI.
- Risks: migration must precede deployment; Census data must be imported manually in an approved DB; initial geographic coverage US only. Google billing/key restrictions and policies/privacy pages require operator configuration. Existing subject associations are unknown and will remain empty until tutors select them.

## Plan
1. Add schema, unapplied migration, importer and validation/ownership tests.
2. Add safe server-side search and public area responses.
3. Add Places picker, profile preferences, search controls and optional map.
4. Validate with isolated database tests, lint, TypeScript and build. Document remaining manual/live checks.

Implementation results and setup instructions will follow below.


## Implementation report

| Phase | Status | Evidence / remaining work |
| --- | --- | --- |
| 0 Audit | Completed in source; live DB inspection blocked | Read-only connection returned OperationalError. No installed extension or deployed schema state claimed. |
| 1 Places | Implemented; live Google validation pending | Reusable PlaceAutocompleteElement, gmp-select / gmp-error, addressComponents-only fetchFields, widget-managed sessions, explicit opt-in loading, direct primary input. US cities/ZIPs supported; state-only and international service areas deferred. |
| 2 Preferences/schema | Implemented; database rollout pending | Additive migration, online-only defaults, owner-only writes, public-area consent, travel radius, optional Place ID, constrained public meeting preferences, one unchanged hourly rate. No Google coordinates stored. |
| 3 Matching | Implemented and isolated-test verified | SQL great-circle miles with latitude prefilter, both radii, online-inclusive combined mode, subject association, price limits, pagination. PostGIS not assumed or enabled. Live PostgreSQL query verification pending. |
| 4 Map | Implemented; browser/live verification pending | AdvancedMarkerElement with DOM children and gmp-click events, keyboard-clickable previews, same-area grouping, 20-result page bound, List/Map toggle, missing-key/map-ID and empty states, scoped light/dark styling. No Dynamic Map construction in List View. |
| 5 Tests | Partial: automated checks pass; live acceptance remains | 26 isolated API/model/import tests and 4 loader tests; TypeScript, targeted lint and production build pass. Full-project lint still has eight pre-existing errors in dashboard JSX and client-actions explicit-any usage. |
| 6 Report | Completed | This document, source changes and generated offline SQL. |

### Changed files (this feature)
- `backend/app/models/service_area.py`, `models/tutor_profile.py`, `models/__init__.py`: independent catalog, mode/preference fields, tutor_subjects association and constraints.
- `backend/app/schemas/location.py`, `schemas/tutor.py`: validated request and public response contracts.
- `backend/app/routes/locations.py`, `routes/tutors.py`, `services/tutor_search.py`: catalog reads, owned preference/subject/profile/availability writes, search and pagination.
- `backend/app/core/config.py`: accepts existing unused GOOGLE_MAPS_API_KEY without exposing it; browser integration uses only public frontend variables.
- `backend/alembic/versions/c21a76e9d304_hybrid_tutor_locations.py`: additive revision after 81099c270fbc. `docs/location-migration.sql` is review-only offline PostgreSQL DDL, not executed.
- `backend/scripts/import_service_areas.py`: explicit operator-run Census national places/ZCTA text importer; existing records are left unchanged.
- `backend/tests/test_locations.py`: isolated SQLite API tests with registered trig functions and synthetic test-only area fixtures.
- `frontend/lib/google-maps.ts`, `lib/types.ts`, `lib/api/api-helper.ts`: lazy typed loader, location/search types, readable validation messages.
- `frontend/components/LocationAutocomplete.tsx`, `ServiceAreaPicker.tsx`, `TutorLocationSettings.tsx`, `TutorMap.tsx`, `TutorCard.tsx`: reusable UI, independent public area selection, owned preferences and subjects, safe map/list results.
- `frontend/app/(landing)/page.tsx`, `landing.module.css`, `app/tutors/(main page)/page.tsx`, `app/tutors/[id]/page.tsx`, `app/(protected)/tutor/profile/page.tsx`, `app/globals.css`: integration into existing screens and cool-blue theme, removal of fabricated public tutor geography and booking claims.
- `frontend/tests/google-maps.test.mjs`: missing key, network/auth failure, shared loader and library isolation tests. No new dependencies.
- Pre-existing changes from prior signup/design work and user package/env edits were preserved.

### Google Cloud setup (manual)
1. Enable billing, **Maps JavaScript API** and **Places API (New)** in the intended project. No Geocoding, Routes or server Places API is needed by this implementation.
2. Restrict the browser key by website referrers (specific localhost development and production origins, including path wildcards where Google requires them) and API restrictions to those two APIs. Never loosen restrictions to hide errors. Set quotas and billing alerts.
3. Create a JavaScript map ID and configure `NEXT_PUBLIC_GOOGLE_MAP_ID`. No demo map ID is hardcoded.
4. Set the frontend build environment variables below and rebuild/restart Next.js. NEXT_PUBLIC values are bundled at build time. Existing local variable names were observed, but key validity, billing and map ownership were not verified.
5. Before production use, publish the operator's real Terms of Use and Privacy Policy incorporating the required Google terms and privacy references. The existing app has no such policy routes; no legal text was invented. The widget/map retain Google's built-in attribution; do not cover or remove it.

| Variable | Location | Purpose |
| --- | --- | --- |
| NEXT_PUBLIC_GOOGLE_MAPS_API_KEY | frontend .env.local / deployment build env | Restricted browser key; missing or invalid key displays an error; online discovery remains usable. |
| NEXT_PUBLIC_GOOGLE_MAP_ID | frontend .env.local / deployment build env | Advanced-marker Google map ID; missing value leaves List View usable. |
| NEXT_PUBLIC_API_URL | frontend | Existing FastAPI origin; unchanged. |
| DATABASE_URL | backend .env | Existing PostgreSQL/Neon connection, secret. |
| NEON_AUTH_BASE_URL, NEON_AUTH_JWKS_URL | backend | Existing JWT validation; unchanged. |
| NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET | frontend server env | Existing session integration; unchanged. |
| CSC_LOCATION_API_KEY, CSC_API_URL | backend | Existing legacy endpoint configuration, retained. |
| GOOGLE_MAPS_API_KEY | backend | Existing legacy setting accepted but not used or sent to clients. No server Google key is required. |

### Neon / catalog rollout (manual, no production commands executed)
1. Review the Alembic revision and generated SQL. Validate on a disposable Neon development branch, inspect current `alembic_version`, confirm it follows repository history, and back up before any production rollout. Do not deploy the model changes against an unmigrated DB.
2. On an explicitly selected nonproduction database, from `backend`, run `.venv/Scripts/python.exe -m alembic upgrade head`. This creates service_areas and tutor_subjects and adds profile columns/constraints; it does not overwrite existing profiles. Existing tutors become online-only with a 25-mile default that is inactive until they opt into in-person lessons.
3. Download and extract official **national places** and/or **ZCTA** Gazetteer files from the Census source linked below. Keep source/year provenance; do not import geocoded residences or Google exports. Tab- and pipe-delimited national formats are accepted.
4. Import the selected files against that approved database, e.g. `.venv/Scripts/python.exe -m scripts.import_service_areas C:/data/2025_Gaz_place_national.txt --kind place --year 2025`; use `--kind zcta` for the national ZCTA file. This command writes catalog rows and is intentionally not run automatically. Use one curated vintage per geography type to avoid duplicate area choices. Coordinates are official representative points, not guaranteed geographic centroids.
5. Tutors can then select their public area, modes, travel limit and subjects in `/tutor/profile`. Existing tutors' subjects remain unassigned until explicitly selected; no subject or location assignments are guessed.
6. Test on the development branch, then have the operator schedule the reviewed production migration/data rollout. Downgrade is deliberately blocked because dropping preferences/catalog data would be destructive.
7. Neon supports PostGIS, but its installation in this DB is unverified. This version uses PostgreSQL built-in trig functions, clamping acos input, a latitude prefilter and B-tree indexes; it requires no extension. At higher volume, measure query plans and migrate the independent service-area points to geography + GiST and ST_DWithin on a reviewed branch. Count and offset queries are bounded by validated filter/pagination inputs but should be profiled for large catalogs.

### Data provenance, licensing and privacy
- Source: [US Census Gazetteer Files](https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html). Official files provide representative coordinates for public geographic areas. Place/ZCTA geography is approximate; ZCTAs are statistical ZIP approximations and do not represent every USPS delivery ZIP or a driving/service boundary. Regions and countries are shown when available. State-only and international areas have no implemented independent catalog yet.
- Census employee-created works are generally not copyrighted in the US; see [Census research transparency/public access policy](https://www2.census.gov/foia/ds_policies/ds027.pdf). UI and API preserve US Census/year provenance. Retain attribution and review terms for any additional non-Census dataset; no such dataset is bundled here.
- [Google Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) permit indefinite Place ID storage but restrict other content. This implementation requests no Google coordinates and stores no Google address components. Address components are used transiently to suggest a catalog search, and the selected city/state or ZIP is resolved exactly to an independent Census area. Places text is not copied into the permanent catalog or serialized into URLs. The widget manages sessions; a minimal addressComponents details request ends the selection session. Field selection avoids requesting displayName, photos, reviews or other unnecessary fields; it is not a promise of free API use.
- Tutor location writes take only a catalog foreign key and optional Place ID, never raw coordinates or a private address. Meeting preferences are fixed public-venue options instead of free text to prevent accidental address publication. In-person saving requires explicit public-area consent. Clearing in-person mode removes the profile's public-area reference and meeting preference.
- Public coordinates always come from the independent catalog; no residential points or random jitter. Same-area map markers are grouped and previews link to existing user-ID profile routes. At most 20 results appear on each frontend map page; general zoom-dependent clustering is deferred unless result limits increase.
- No navigator.geolocation call or permission prompt exists. Location selection uses Google without requesting location permission. Online discovery works without Google. Data is retrieved from the API only after users type in catalog search; Google Places loads directly when a location field is displayed; map libraries still load only for Map View.

### Validation performed
- `cd backend; .venv/Scripts/python.exe -m unittest discover -s tests -v`: **26 passing tests**, isolated SQLite database, no network database writes. Coverage includes online registration, hybrid search, zero radius, both radius constraints, empty results, bad mode/area/NaN/range/price/pagination values, subjects, private payload exclusion, owner/role/auth checks, existing availability round trip, catalog wildcard escaping and importer format handling.
- `node --test frontend/tests/google-maps.test.mjs`: **4 passing tests**. Node's built-in TypeScript stripping is required (tested with the installed Node runtime). Node emits a harmless module-type warning; project package type was not changed to silence it.
- `node frontend/node_modules/typescript/bin/tsc --noEmit --project frontend/tsconfig.json`: passed.
- Targeted ESLint on new components, loader/types, search/landing/public profile and API helper: passed. Existing tutor editor still has prior unused-variable warnings. Full repository ESLint was run and reports eight existing errors in student/tutor dashboard apostrophes and client-actions.ts explicit-any declarations, plus existing unused-variable warnings. No lint/security rules were disabled.
- `cd frontend; node node_modules/next/dist/bin/next build`: passed, including compilation, TypeScript and route generation.
- `cd backend; .venv/Scripts/python.exe -m alembic upgrade 81099c270fbc:c21a76e9d304 --sql`: generated offline PostgreSQL SQL successfully. No migration execution or catalog import was performed.
- `git diff --check`: passed.

### Remaining live acceptance and limitations
- Live PostgreSQL schema/extension inspection failed with OperationalError. Migration and PostgreSQL trig execution require development-branch validation; SQLite tests do not establish production performance or deployed compatibility.
- No browser-control environment was available. Real Google widget keyboard behavior, API billing/restrictions/errors, AdvancedMarkerElement previews, responsive layout and light/dark screenshots require browser acceptance. Missing/invalid-key paths were tested at loader level, not against billable Google services.
- Service-area data is not bundled or imported. In-person setup cannot complete until the operator imports the catalog. Empty/unavailable catalog states are explicit. No geographic values were fabricated; synthetic test fixtures never leave the isolated test DB.
- Real booking, confirmed slots and date/time booking filters are absent in the original system and remain absent. Availability records are displayed as tutor-entered information, not confirmed open appointments. No driving distances are claimed.
- Existing language/rating widgets were unimplemented placeholders, not preserved as false functional filters. Subject and price controls now have real server filtering; authenticated tutors can select catalog subjects.
- Existing signup's separate Neon/app-user transactions and broader account-provisioning security were not redesigned. Location/profile/availability writes now enforce tutor ownership; authentication infrastructure is unchanged.
- Recommended next work: live development-branch rollout and UI acceptance, operator-owned terms/privacy pages, production query-plan measurement and PostGIS if justified, international licensed catalog support, eventual real booking/conflict management, and remediation of pre-existing repository lint errors.

### Primary implementation references
- [Google current autocomplete widget and session guidance](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new)
- [Google library loading](https://developers.google.com/maps/documentation/javascript/load-maps-js-api)
- [Google Advanced Markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview)
- [Google API security](https://developers.google.com/maps/api-security-best-practices)
- [Neon PostGIS support](https://neon.com/docs/extensions/postgis)
