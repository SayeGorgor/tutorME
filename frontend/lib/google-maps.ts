// Deliberately small typed surface; no global Maps dependency on unrelated routes.
export type SelectedLocation = {
  placeId: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country: string;
};
export type AddressComponent = { longText: string; shortText: string; types: string[] };
type Place = { id: string; addressComponents?: AddressComponent[]; fetchFields(options: { fields: string[] }): Promise<unknown> };
export type PlaceSelectionEvent = Event & { placePrediction: { toPlace(): Place } };
export type PlaceWidget = HTMLElement & { value?: string };
export type MapInstance = { fitBounds(bounds: Bounds, padding?: number): void };
type Bounds = { extend(point: { lat: number; lng: number }): void };
export type Marker = HTMLElement & { map: MapInstance | null };
type Libraries = {
  places: { PlaceAutocompleteElement: new (options: { includedPrimaryTypes: string[]; includedRegionCodes: string[] }) => PlaceWidget };
  maps: { Map: new (element: HTMLElement, options: { center: { lat: number; lng: number }; zoom: number; mapId: string; colorScheme: string }) => MapInstance;
    InfoWindow: new () => { setContent(content: HTMLElement): void; open(options: { map: MapInstance; anchor: Marker }): void; close(): void } };
  marker: { AdvancedMarkerElement: new (options: { map: MapInstance; position: { lat: number; lng: number }; title: string; gmpClickable: boolean }) => Marker };
};
type MapsAPI = { importLibrary<K extends keyof Libraries>(name: K): Promise<Libraries[K]>; LatLngBounds: new () => Bounds };
declare global {
  interface Window { google?: { maps: MapsAPI }; tutorMEMapsReady?: () => void; gm_authFailure?: () => void }
}
let bootstrap: Promise<MapsAPI> | undefined;
export function loadGoogleMaps(): Promise<MapsAPI> {
  if (bootstrap) return bootstrap;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error("Location search is not configured. Please try again later."));
  bootstrap = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    let settled = false;
    const fail = () => { if (!settled) { settled = true; clearTimeout(timer); reject(new Error("Google Maps could not load. Please check your connection and try again later.")); } };
    const timer = window.setTimeout(fail, 15000);
    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => { fail(); previousAuthFailure?.(); window.dispatchEvent(new Event("tutorme-maps-error")); };
    window.tutorMEMapsReady = () => {
      if (window.google && !settled) { settled = true; clearTimeout(timer); resolve(window.google.maps); }
    };
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({ key, v: "weekly", loading: "async", callback: "tutorMEMapsReady" })}`;
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return bootstrap;
}
export async function googleLibrary<K extends keyof Libraries>(name: K): Promise<Libraries[K]> {
  const maps = await loadGoogleMaps();
  return maps.importLibrary(name);
}
