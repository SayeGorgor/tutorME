"use client";
import { useEffect, useRef, useState } from "react";
import { googleLibrary, loadGoogleMaps, type Marker } from "@/lib/google-maps";
import type { TutorSearchItem } from "@/lib/types";
import { areaLabel } from "./ServiceAreaPicker";

export default function TutorMap({ tutors }: { tutors: TutorSearchItem[] }) {
  const host = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("Loading map...");
  const eligible = tutors.filter(t => t.inPersonEnabled && t.serviceArea && t.inPersonMatch);
  const hasPoints = eligible.length > 0;
  useEffect(() => {
    let active = true;
    const markers: Marker[] = [];
    const listeners: { remove(): void }[] = [];
    let closeInfo: (() => void) | undefined;
    const onError = () => setMessage("The map is unavailable. Use List View to explore these tutors.");
    window.addEventListener("tutorme-maps-error", onError);
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;
    if (hasPoints && mapId) {
      Promise.all([googleLibrary("maps"), googleLibrary("marker"), loadGoogleMaps()]).then(([maps, markerLib, api]) => {
        if (!active || !host.current) return;
        const mapped = tutors.filter(t => t.inPersonEnabled && t.serviceArea && t.inPersonMatch);
        const first = mapped[0].serviceArea!;
        const map = new maps.Map(host.current, { center: { lat: first.latitude, lng: first.longitude }, zoom: 10, mapId, colorScheme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "DARK" : "LIGHT" });
        const info = new maps.InfoWindow();
        closeInfo = () => info.close();
        const bounds = new api.LatLngBounds();
        // Exact same public area points are intentionally grouped, never jittered.
        const groups = new Map<string, TutorSearchItem[]>();
        for (const tutor of mapped) { const key = tutor.serviceArea!.id; groups.set(key, [...(groups.get(key) || []), tutor]); }
        for (const group of groups.values()) {
          const area = group[0].serviceArea!;
          const point = { lat: area.latitude, lng: area.longitude };
          bounds.extend(point);
          const badge = document.createElement("div");
          badge.className = "rounded-full border-2 border-white bg-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-md";
          badge.textContent = group.length > 1 ? `${group.length} tutors` : `$${group[0].price}/hr`;
          const marker = new markerLib.AdvancedMarkerElement({ map, position: point, title: `${areaLabel(area)}: ${group.length} tutor(s), approximate service area`, gmpClickable: true });
          marker.append(badge);
          markers.push(marker);
          const onClick = () => {
            const content = document.createElement("div"); content.className = "map-preview";
            const title = document.createElement("p"); title.textContent = `${areaLabel(area)} - approximate service area`; content.appendChild(title);
            for (const tutor of group) { const link = document.createElement("a"); link.href = `/tutors/${tutor.userId}`; link.textContent = `${tutor.user.firstName} ${tutor.user.lastName}${tutor.isDemo ? " (Demo Profile)" : ""} / $${tutor.price}/hr`; content.appendChild(link); }
            info.setContent(content); info.open({ map, anchor: marker });
          };
          marker.addEventListener("gmp-click", onClick);
          listeners.push({ remove: () => marker.removeEventListener("gmp-click", onClick) });
        }
        if (groups.size > 1) map.fitBounds(bounds, 50);
        setMessage("");
      }).catch(() => { if (active) onError(); });
    }
    return () => { active = false; closeInfo?.(); listeners.forEach(l => l.remove()); markers.forEach(m => { m.map = null; }); window.removeEventListener("tutorme-maps-error", onError); };
  }, [tutors, hasPoints]);
  const displayed = !hasPoints ? "No qualifying in-person tutors on this results page. Online tutors remain in List View." : !process.env.NEXT_PUBLIC_GOOGLE_MAP_ID ? "Map View is not configured. Use List View instead." : message;
  return <section aria-label="Tutor service area map" className="surface min-w-0 overflow-hidden rounded-2xl bg-white">
    <p className="p-4 text-sm text-slate-600">Approximate city/ZIP service areas, not meeting addresses. Distances are straight-line estimates. Appointment times are not confirmed.</p>
    {displayed && <p role="status" className="p-4">{displayed}</p>}
    {hasPoints && process.env.NEXT_PUBLIC_GOOGLE_MAP_ID && <div ref={host} className="h-[65dvh] min-h-80 w-full" />}
  </section>;
}
