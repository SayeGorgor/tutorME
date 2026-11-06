# Google Maps design and usage review

Reviewed November 5, 2026 against current Google documentation. This is a source review, not a certification of the live deployment or a legal opinion.

## Design findings and changes
- Google documents border, border-radius, background-color, color, font, and color-scheme as supported PlaceAutocompleteElement styling. Existing light-blue styling uses these supported host properties.
- Native prediction UI and Google attribution have not been replaced, filtered, recolored independently, scaled or hidden. The container allows visible overflow. No selectors target the logo or prediction-list internals.
- The landing widget had a forced 44px height. This was a potential layout/clipping risk, not a confirmed rendered violation. Removed the fixed height so the widget can retain its native content size. A ResizeObserver measures only its outer host and matches neighboring controls/button to it. Equal widths and the compact pill remain.
- Landing uses a light widget on its light search surface. Other location widgets use native light/dark color-scheme. Google controls the corresponding attribution appearance. There is no custom CSS filter or logo replacement.
- Independent Census area summaries are visually separated from Google predictions. Google-provided place details are not mixed into tutor map previews.
- No extra explanatory Census/matching disclaimer is required by the cited Google branding rules; the previously removed landing disclaimer remains removed. This does not waive the separate Terms/Privacy requirement below.

## Usage checks
- Existing widget uses gmp-select and PlacePrediction.toPlace().fetchFields with addressComponents only. The widget supplies session tokens automatically. No predictions, address components, Google coordinates, photos or reviews are permanently stored by this flow.
- Only optional Place IDs are saved alongside independently imported geographic records. Current Places policy permits indefinite Place ID storage; no blanket exemption for city/region coordinates is assumed.
- Map View uses Google Maps and preserves its native attribution. Public tutor markers use independent public area points. No non-Google basemap is used for Google content.
- Manual checks still required: active key API/referrer restrictions, billing account region/EEA applicability, real widget dropdown attribution at mobile/desktop sizes, dark/light contrast, keyboard zoom and actual map attribution visibility. These cannot be certified by source inspection and build tests.

## Remaining requirement before production use
Google's Places policies require the application's own publicly accessible Terms of Use and Privacy Policy incorporating the applicable Google terms and privacy references. The repository has no such routes or configured external policy URLs. Adding only links to Google's policies would not replace the app's own policies. Operator identity, privacy contact, retention/deletion practices, hosting disclosures and applicable regional obligations need operator-approved text. No fictitious policy, consent, legal operator or contact information was added.

Provide approved public policies, link them from the landing/signup and discovery screens, and include the appropriate Google references before describing the deployment as compliant. This review does not claim that a UI adjustment resolves that outstanding usage requirement.

## Primary references
- [Places policies: attribution, storage and publicly accessible policies](https://developers.google.com/maps/documentation/places/web-service/policies)
- [PlaceAutocompleteElement: supported CSS properties, events and automatic sessions](https://developers.google.com/maps/documentation/javascript/reference/places-widget)
- [Autocomplete widget integration guide](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new)

## Validation
TypeScript, targeted ESLint and production build are checked after the change. Live browser visual verification is unavailable in this environment.
