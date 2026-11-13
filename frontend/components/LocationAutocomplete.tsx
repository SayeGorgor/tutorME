"use client";

import { useEffect, useId, useRef, useState } from "react";
import { googleLibrary, type SelectedLocation, type PlaceSelectionEvent } from "@/lib/google-maps";

// Google address components are transient; matching uses independent service-area records.
export default function LocationAutocomplete({
  onSelect,
  onInput,
  label = "City or ZIP code (US)",
}: {
  onSelect: (location: SelectedLocation) => void;
  onInput: () => void;
  label?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const onInputRef = useRef(onInput);

  const [status, setStatus] = useState("Loading Google location search...");

  const labelId = useId();

  useEffect(() => {
    onSelectRef.current = onSelect;
    onInputRef.current = onInput;
  }, [onSelect, onInput]);

  useEffect(() => {
    let active = true;
    let widget: HTMLElement | undefined;
    let sequence = 0;
    let resizeObserver: ResizeObserver | undefined;
    let searchForm: HTMLFormElement | null = null;

    const onError = () =>
      setStatus(
        "Location search is unavailable. Please check your connection and try again later.",
      );

    const changed = () => {
      ++sequence;
      setStatus("");
      onInputRef.current();
    };

    const selected = async (event: Event) => {
      const current = ++sequence;

      try {
        const place = (event as PlaceSelectionEvent).placePrediction.toPlace();

        await place.fetchFields({ fields: ["addressComponents"] });

        if (!active || current !== sequence) return;

        const components = place.addressComponents || [];

        const country = components.find((c) => c.types.includes("country"))?.shortText;
        const city = components.find((c) => c.types.includes("locality"))?.longText;
        const postalCode = components.find((c) => c.types.includes("postal_code"))?.longText;
        const region = components.find((c) =>
          c.types.includes("administrative_area_level_1"),
        )?.shortText;

        if (country !== "US" || (!postalCode && (!city || !region))) {
          onInputRef.current();
          setStatus(
            "Choose a US city or ZIP code. State-only service areas are not supported yet.",
          );

          return;
        }

        onSelectRef.current({ placeId: place.id, city, region, postalCode, country });
        setStatus("");
      } catch {
        if (active) onError();
      }
    };

    googleLibrary("places")
      .then(({ PlaceAutocompleteElement }) => {
        if (!active || !container.current) return;

        widget = new PlaceAutocompleteElement({
          includedPrimaryTypes: ["(regions)"],
          includedRegionCodes: ["us"],
        });
        widget.setAttribute("aria-labelledby", labelId);
        widget.setAttribute("placeholder", "City or ZIP code");
        widget.className = "w-full";

        widget.addEventListener("input", changed);
        widget.addEventListener("gmp-select", selected);
        widget.addEventListener("gmp-error", onError);

        container.current.replaceChildren(widget);
        searchForm = widget.closest<HTMLFormElement>("form[data-match-location-height]");

        if (searchForm && typeof ResizeObserver !== "undefined") {
          // Measure the host only. Never resize Google's internal input, logo or
          // prediction list: neighboring fields adapt to the native widget instead.
          const nativeWidget = widget;

          resizeObserver = new ResizeObserver(() => {
            const height = Math.ceil(nativeWidget.getBoundingClientRect().height);

            if (height > 0)
              searchForm?.style.setProperty(
                "--location-control-height",
                `${Math.max(44, height)}px`,
              );
          });

          resizeObserver.observe(widget);
        }

        setStatus("");
      })
      .catch(() => {
        if (active) onError();
      });

    window.addEventListener("tutorme-maps-error", onError);

    return () => {
      active = false;

      resizeObserver?.disconnect();
      searchForm?.style.removeProperty("--location-control-height");

      widget?.removeEventListener("input", changed);
      widget?.removeEventListener("gmp-select", selected);
      widget?.removeEventListener("gmp-error", onError);
      widget?.remove();

      window.removeEventListener("tutorme-maps-error", onError);
    };
  }, [labelId]);

  return (
    <div className="location-autocomplete flex flex-col gap-2">
      <span id={labelId} className="location-label text-sm font-medium">
        {label}
      </span>
      <div ref={container} className="google-location-widget" />
      {status && (
        <p role="status" className="text-sm text-slate-600">
          {status}
        </p>
      )}
    </div>
  );
}
