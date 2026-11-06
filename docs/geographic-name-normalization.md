# Census geographic name normalization

November 6, 2026

Names now normalize at the API/display layer; original Census names and all geographic records remain unchanged. No database connection, update, import, seed or migration ran in this task. Authentication, booking code and feature flags were not changed.

## Naming audit

Reviewed the ServiceArea model, importer, resolver, catalog search, tutor radius service, Google selection component, tutor preferences and all shared area-label callers. The importer preserves the Census NAME verbatim after trimming input padding, but does not retain LSAD in the schema. The previous resolver stripped only six simple suffixes, including from non-Census records. Frontend labels displayed raw names. Radius matching already uses stable area IDs and independent coordinates rather than names.

Inspected the official 2025 national Places ZIP in memory, without importing or saving it. It contains 32,350 places. Its LSAD groups are:

| LSAD | Records | Classification / pattern |
| --- | ---: | --- |
| 00 | 13 | Mixed unclassified/consolidated balance names, including names with no removable suffix |
| 21 | 1,214 | borough |
| 25 | 10,232 | city |
| 37 | 7 | municipality |
| 43 | 4,325 | town |
| 47 | 3,717 | village |
| 53 | 3 | city and borough |
| 55 | 214 | comunidad |
| 57 | 12,540 | CDP |
| 62 | 78 | zona urbana |
| CG | 1 | consolidated government |
| CN | 1 | corporation |
| MG | 1 | metropolitan government |
| UC | 1 | urban county |
| UG | 3 | unified government |

These are source-file findings, not a fresh audit of the configured database's contents. The user's imported counts were not re-queried. [Official source archive](https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_place_national.zip), [Census LSAD definitions](https://www.census.gov/library/reference/code-lists/legal-status-codes.html).

## Normalization and preservation rules

- A record must have US country, a canonical `census-<year>-place-<seven-digit GEOID>` ID, no postal code, and matching `US Census Gazetteer <year>` provenance before place suffix normalization applies. Unrecognized/non-Census records keep their names.
- Remove only a recognized terminal classification, longest compound first. Support all named patterns above. Collapse whitespace for recognized Census place display; preserve capitalization, accents, punctuation and actual name words rather than title-casing them.
- Honor Census's canonical lowercase classification spelling; CDP accepts acronym case variants. Title-cased City, Town or Village is conservatively treated as actual name content. Thus `Ocean City city` becomes `Ocean City`, `Town and Country city` becomes `Town and Country`, and `Atlanta City` is left alone. Arbitrarily recased `Atlanta CITY` stays unchanged rather than risking removal of a real name component.
- Retain `(balance)`: `Milford city (balance)` becomes `Milford (balance)`. It distinguishes a geography and is not cosmetic noise. Unknown classifications, classification-only names, and repeated terminal classifications remain unchanged. Normalization is deterministic and idempotent.
- Recognized Census ZCTAs display their exact five-digit postal code, preserving leading zeros. Include the stored region if present; otherwise use country, e.g. `00123, US`. Do not fabricate a state for a ZCTA, which may span state boundaries.
- The response's original `name`, ID, region, country, postal code, coordinates and source are preserved. Added computed `displayName` and `displayLabel` fields require no model column or migration. Typical labels are `Atlanta, GA`, `New York, NY` and `Los Angeles, CA`.

## Search, resolution and collision behavior

Catalog search retains escaped original-name/ZIP prefix queries and now accepts an optional `, XX` region suffix. Because ordinary normalization removes only terminal classifications, normalized prefixes still find original names. Balance-name queries use the base prefix while retaining the qualifier in returned labels.

The Google-selection resolver narrows candidates by US country, selected region, nonpostal geographic type and escaped name prefix. It compares the full normalized name **or original name** case-insensitively with collapsed whitespace. A balance qualifier is preserved during exact comparison. A bare `Milford` will not silently resolve to `Milford (balance)`. ZIP resolution remains exact and unchanged.

Multiple records with the same normalized name in the same state return 409; records across states are distinguished by the selected region. An explicitly supplied original classification can disambiguate a record if that original name is unique. IDs are never merged. Candidate overflow also returns ambiguity instead of taking the first match. List responses retain separate IDs and original names for disambiguation.

Existing query bounds remain: 20 catalog results and at most 101 resolver candidates, with overflow rejection. No full-catalog Python scan, per-row database lookup, SQL normalization expression, new column or new index is introduced. Existing primary-key, name and postal indexes remain. **The existing `lower(name)` prefix condition is not guaranteed to use the ordinary name B-tree**; no live query plan or latency claim is made. Production query-plan measurement after import remains advisable. A functional/pattern index would require separate measured evidence and reviewed DDL, rather than an automatic migration in this task.

The Google widget remains the sole primary autocomplete input. No new Google APIs or per-keystroke custom autocomplete were added. Only the resolved independent area ID/optional allowed Place ID feed existing preference saves; Google coordinates are not copied into the Census catalog. Tutor radius calculations and grouping by area ID are unchanged.

## Frontend coverage

The shared label function consumes `displayLabel`, so student selection/filter restoration, tutor location preferences/onboarding, profile details, tutor cards, map marker titles and map previews share the same label. Saved preferences restore by stable ID and receive the computed API fields. For an older payload without computed fields, the frontend uses a conservative original-name/ZIP fallback; it does not independently guess Census suffix rules. Refresh/restart the backend when deploying this additive response change.

## Files changed

- `backend/app/services/geographic_names.py`: reusable provenance-aware naming and labels.
- `backend/app/schemas/location.py`: computed display fields, also used by nested tutor responses.
- `backend/app/routes/locations.py`: shared normalized/original-name matching and city/state queries.
- `backend/tests/test_geographic_names.py`: naming, provenance, collisions, resolver, ZIP, balance and radius regressions.
- `backend/tests/test_locations.py`: synthetic resolver fixtures use raw names; Census-specific suffix tests now live in the dedicated provenance-aware suite.
- `frontend/lib/service-area-label.ts`: shared API-label consumer.
- `frontend/lib/types.ts`: additive display fields with older-payload compatibility.
- `frontend/components/ServiceAreaPicker.tsx`: uses/re-exports the shared function for existing callers.
- `frontend/tests/service-area-label.mjs`: display/fallback regressions.
- This report.

## Validation and remaining edges

- Isolated backend suite: **78 passed, 1 live PostgreSQL test skipped** (79 total).
- Frontend Node tests: **7 passed**, including three label checks and four Google loader regressions.
- TypeScript `--noEmit` and Next production build: passed.
- ESLint: no errors, 10 existing unused-variable warnings in the tutor profile page.
- Tests cover the requested simple names, genuine City/Town/Village components, whitespace/casing, compound classifications, idempotence, state collisions, same-state ambiguity, normalized/original Google selections, exact ZIP labels/matching, balance qualifiers, ID-based radius searches, provenance gates, and unchanged raw fields/coordinates.

No live browser, database query-plan, geographic mutation or Google request was performed. Tests use in-memory SQLite fixtures and mocked browser loading. Existing seed regressions operate only on those synthetic fixtures.

LSAD is not retained in existing records, so unknown or unusually recased names cannot be classified authoritatively from text alone; they remain conservative. Consolidated/balance names intentionally retain their qualifier. No aliases translate a consolidated geography to a broader city's colloquial name, and no state is inferred for stateless ZCTAs. Source amendments or new naming conventions may require extending the allowlist after review. Original names and source attribution remain available for that review.
