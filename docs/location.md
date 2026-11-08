# Location integration

Google Places is the primary input; the API resolves selected city/state or ZIP to an independent Census service area. Public areas represent cities/ZIPs, not home addresses or browser geolocation. [Location routes](../backend/app/routes/locations.py), [naming](../backend/app/services/geographic_names.py) and [search](../backend/app/services/tutor_search.py) separate identity, display and distance calculations.

## Selection and discovery

Native PlaceAutocompleteElement retains Google attribution and color-scheme behavior. There is no custom per-keystroke local autocomplete or substitute pretending to be Google when unavailable; online discovery remains. Resolve only after selection. Restore saved filters by stable area ID. Reject unsupported/ambiguous matches instead of guessing.

Normalize only recognized Census-provenance display names. Preserve raw name/ID/coordinates/source, proper-name words, accents and balance qualifiers. Remove known terminal classifications conservatively; ZIPs retain leading zeros. Do not merge area IDs sharing display names. Region narrows resolution, ambiguity conflicts and candidate queries stay bounded.

In-person search uses independent representative coordinates, a latitude prefilter and spherical distance bounded by both search and tutor travel radius. It is not home-to-home routing or travel-time scheduling. Google coordinates are not copied into the Census catalog. Pagination bounds map results; Dynamic Maps is separate from list view and requires its own configuration.

## Guarded import and recovery

The [importer](../backend/scripts/import_service_areas.py) streams reviewed official files with kind/year provenance into batches (default 1,000; range 1-5,000). One multi-row PostgreSQL insert uses primary-key `ON CONFLICT DO NOTHING RETURNING id`. Repeats skip existing IDs without overwriting coordinates. Avoid casually mixing vintages: year contributes to identity and can create ambiguous places.

Expected project/branch/database are mandatory operator-supplied arguments; connection URLs remain private. The CLI requires psycopg and explicit TLS. Read-only identity verification precedes writes, then every batch rechecks identity inside its own transaction/connection. A matching identifier proves target identity, not development authorization.

Each batch commits independently. Errors/cancellation roll back the active batch when possible; earlier commits remain. Connection loss at commit can leave the final outcome uncertain, so rerun the same reviewed file to skip committed IDs. Never delete rows to restart or run old/new importers concurrently. Progress distinguishes parsed records from committed inserts/skips; failures avoid driver SQL and credentials. Reruns do not repair existing coordinates.

## Provider and performance limits

Restrict the public browser Maps key by origins/APIs and configure its map ID deliberately. Public keys/variable names are not backend credentials, but quota restrictions matter. Inspect actual widget attribution, predictions, keyboard behavior and legal links; responsive fixtures mock it. Preserve independent-data licensing/provenance.

`lower(name)` prefix matching is not guaranteed to use the ordinary name B-tree. Measure realistic plans before adding functional indexes/PostGIS. No live import, benchmark or provider test ran during consolidation. See [deployment](deployment.md) and [testing](testing.md).

## Source provenance and attribution references

The original implementation reports used the [Census Gazetteer reference](https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html), [2025 national Places archive](https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_place_national.zip), [2025 national ZCTA archive](https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_zcta_national.zip) and [Census reproduction policy](https://www2.census.gov/foia/ds_policies/ds027.pdf). These are preserved source references, not a new dataset download or validation. Confirm intended vintage, headers, file checksums and provenance before importing; preserve the dataset source/year rather than mixing vintages silently.

For Google integration/attribution, retain the [Place Autocomplete element guidance](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new), [Places usage policies](https://developers.google.com/maps/documentation/places/web-service/policies) and [API security guidance](https://developers.google.com/maps/api-security-best-practices). Actual widget branding/legal-link/provider acceptance remains separate from synthetic responsive evidence.
