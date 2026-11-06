"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api/api-helper";
import type { SelectedLocation } from "@/lib/google-maps";
import type { ServiceArea } from "@/lib/types";

const LocationAutocomplete = dynamic(() => import("./LocationAutocomplete"), {
  ssr: false,
  loading: () => <p role="status" className="text-sm text-slate-600">Loading location search...</p>,
});
export { areaLabel } from "@/lib/service-area-label";

export default function ServiceAreaPicker({ onChange, showDescription = true, label }: {
  value: ServiceArea | null;
  onChange: (area: ServiceArea | null, placeId?: string) => void;
  showDescription?: boolean;
  label?: string;
}) {
  const [message, setMessage] = useState("");
  const request = useRef(0);
  useEffect(() => () => { ++request.current; }, []);

  const invalidate = () => {
    ++request.current;
    onChange(null);
    setMessage("");
  };
  const select = async (location: SelectedLocation) => {
    const current = ++request.current;
    onChange(null);
    setMessage("Applying selected location...");
    const { placeId, ...address } = location;
    // One exact lookup after selection, never per-keystroke custom autocomplete.
    // Only the independent catalog area and optional Place ID can be persisted.
    const result = await apiFetch<ServiceArea>("/api/locations/resolve", { method: "POST", body: address });
    if (current !== request.current) return;
    if (!result.data || result.error) {
      setMessage(result.error?.message || "This location cannot be used for nearby search yet. Choose another city or ZIP code.");
      return;
    }
    onChange(result.data, placeId);
    setMessage("");
  };
  return <div className="location-ui flex min-w-0 flex-col gap-3">
    <LocationAutocomplete onSelect={select} onInput={invalidate} label={label} />
    {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
    {showDescription && <p className="text-xs text-slate-500">Nearby matching uses public city/ZIP representative points from the US Census Bureau. No home address or location permission needed.</p>}
  </div>;
}
