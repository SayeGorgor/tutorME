import type { ServiceArea } from "./types";

// Normalization belongs to the API; retain a conservative fallback for older payloads.
export const areaLabel = (area: ServiceArea): string => area.displayLabel ||
  [area.displayName || area.postalCode || area.name, area.region, area.country !== "US" || !area.region ? area.country : null]
    .filter(Boolean).join(", ");
