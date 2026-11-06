"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import TutorCard from "@/components/TutorCard";
import ResponsivePanel from "@/components/ResponsivePanel";
import ServiceAreaPicker from "@/components/ServiceAreaPicker";
import { apiFetch } from "@/lib/api/api-helper";
import { getSubjects } from "@/lib/api/actions/client-actions";
import type { ServiceArea, Subject, TutorSearchResponse } from "@/lib/types";
const TutorMap = dynamic(() => import("@/components/TutorMap"), { ssr: false, loading: () => <p role="status">Loading Map View...</p> });
const PAGE_SIZE = 20;

export default function TutorsPage() {
  const params = useSearchParams();
  return <TutorDiscovery key={params.toString()} query={params.toString()} />;
}
function TutorDiscovery({ query }: { query: string }) {
  const router = useRouter();
  const initial = new URLSearchParams(query);
  const [mode, setMode] = useState(initial.get("mode") || initial.get("sessionType") || "all");
  const [subject, setSubject] = useState(initial.get("subject") || "");
  const [area, setArea] = useState<ServiceArea | null>(null);
  const [areaReady, setAreaReady] = useState(!initial.get("areaId"));
  const [radius, setRadius] = useState(initial.get("radius") || "25");
  const [minPrice, setMinPrice] = useState(initial.get("minPrice") || "0");
  const [maxPrice, setMaxPrice] = useState(initial.get("maxPrice") || "200");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [result, setResult] = useState<TutorSearchResponse | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(query);
    if (!params.has("mode") && params.has("sessionType")) params.set("mode", params.get("sessionType")!);
    for (const key of [...params.keys()]) if (!["mode", "subject", "areaId", "radius", "minPrice", "maxPrice", "offset"].includes(key)) params.delete(key);
    params.set("limit", String(PAGE_SIZE));
    if (!params.has("maxPrice")) params.set("maxPrice", "200");
    apiFetch<TutorSearchResponse>(`/api/tutors/search?${params}`).then(response => { if (active) { setResult(response.data || null); setError(response.error?.message || ""); } });
    getSubjects().then(response => { if (active) setSubjects(response.data || []); });
    const areaId = params.get("areaId");
    if (areaId) apiFetch<ServiceArea>(`/api/locations/areas/${encodeURIComponent(areaId)}`).then(response => { if (active) { setArea(response.data || null); setAreaReady(true); if (response.error) setFormError("The selected service area is no longer supported. Choose another area."); } });
    return () => { active = false; };
  }, [query]);
  const hasAreaFilter = !!initial.get("areaId");
  const paginate = (offset: number) => { const params = new URLSearchParams(query); params.set("offset", String(offset)); router.push(`/tutors?${params}`); };
  return <div className="location-ui grid min-w-0 flex-1 grid-cols-1 items-start gap-6 p-4 sm:p-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:p-8">
    <ResponsivePanel title="Refine your search">
      <form className="flex flex-col gap-5" onSubmit={event => {
        event.preventDefault();
        if (mode === "in-person" && !area) { setFormError("Choose a city or ZIP code for in-person lessons."); return; }
        if (Number(minPrice) > Number(maxPrice)) { setFormError("Minimum price cannot exceed maximum price."); return; }
        const params = new URLSearchParams({ mode, radius, minPrice, maxPrice });
        const subjectName = subject.trim().replace(/\s+/g, " ");
        if (subjectName) params.set("subject", subjectName);
        if (area && mode !== "online") params.set("areaId", area.id);
        setFormError(""); router.push(`/tutors?${params}`);
      }}>
        <label className="flex flex-col gap-2 text-sm font-medium">Lesson format<select value={mode} onChange={e => setMode(e.target.value)} className="border bg-white p-3"><option value="all">All tutors</option><option value="online">Online tutoring</option><option value="in-person">In-person tutoring</option></select></label>
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-2 text-sm font-medium">Subject
            <input type="text" list="tutor-search-subjects" value={subject} onChange={e => setSubject(e.target.value)} maxLength={255} autoComplete="off" placeholder="All subjects" aria-describedby="subject-search-help" className="min-w-0 border bg-white p-3" />
          </label>
          <datalist id="tutor-search-subjects">{subjects.map(s => <option key={s.id} value={s.name} />)}</datalist>
          <p id="subject-search-help" className="text-xs text-slate-500">Choose a suggestion or type any subject. Leave blank to search all subjects.</p>
        </div>
        {mode !== "online" && <>{areaReady ? <ServiceAreaPicker value={area} onChange={setArea} /> : <p role="status">Loading selected area...</p>}<label className="flex flex-col gap-2 text-sm font-medium">Search radius: {radius} miles<input type="range" min={0} max={100} step={1} value={radius} onChange={e => setRadius(e.target.value)} /></label><p className="text-xs text-slate-500">In-person matches must fit both your radius and the tutor travel limit. Online tutors remain included in All tutors.</p></>}
        <fieldset><legend className="mb-2 text-sm font-medium">Hourly price ($)</legend><div className="grid grid-cols-2 gap-2"><label className="flex min-w-0 flex-col gap-1 text-xs">Minimum<input required type="number" min={0} max={10000} value={minPrice} onChange={e => setMinPrice(e.target.value)} className="w-full border bg-white p-3 text-sm" /></label><label className="flex min-w-0 flex-col gap-1 text-xs">Maximum<input required type="number" min={0} max={10000} value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="w-full border bg-white p-3 text-sm" /></label></div></fieldset>
        <button disabled={!areaReady} className="rounded-xl bg-blue-700 p-3 text-sm font-semibold text-white hover:bg-blue-800">Apply filters</button>
        {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
      </form>
    </ResponsivePanel>
    <section className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="mb-1 text-xs font-semibold tracking-widest text-blue-700">YOUR NEXT STEP FORWARD</p><h1 className="text-3xl font-semibold">Find your next tutor</h1><p className="mt-2 text-sm text-slate-600">{result ? `${result.total} tutors match your search` : error ? "Search could not load" : "Searching tutors..."}</p></div><div className="flex rounded-xl border border-slate-200 bg-white p-1" aria-label="Results view"><button aria-pressed={view === "list"} onClick={() => setView("list")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === "list" ? "bg-blue-100 text-blue-800" : "text-slate-600"}`}>List View</button><button aria-pressed={view === "map"} onClick={() => setView("map")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === "map" ? "bg-blue-100 text-blue-800" : "text-slate-600"}`}>Map View</button></div></div>
      <p className="text-sm text-slate-500">Lesson offerings are shown here. Appointment availability is not confirmed.</p>
      {error ? <p role="alert" className="surface rounded-xl bg-white p-5 text-red-700">{error}</p> : !result ? <p role="status">Loading tutors...</p> : view === "map" ? hasAreaFilter && initial.get("mode") !== "online" ? <TutorMap tutors={result.items} /> : <p role="status" className="surface rounded-2xl bg-white p-6">Choose a city/ZIP code and apply All tutors or In-person tutoring to explore nearby service areas on the map.</p> : result.items.length === 0 ? <p role="status" className="surface rounded-2xl bg-white p-6">No tutors match these filters. Try a larger radius, another subject, or online lessons.</p> : <ul className="flex flex-col gap-4">{result.items.map(tutor => <li key={tutor.id}><TutorCard tutor={tutor} /></li>)}</ul>}
      {result && result.total > PAGE_SIZE && <nav aria-label="Search results pagination" className="flex flex-wrap items-center justify-between gap-3"><button disabled={result.offset === 0} onClick={() => paginate(Math.max(0, result.offset - PAGE_SIZE))} className="rounded-xl border px-4 py-3 text-sm">Previous</button><span className="text-sm">{result.offset + 1} - {Math.min(result.offset + result.limit, result.total)} of {result.total}</span><button disabled={result.offset + result.limit >= result.total} onClick={() => paginate(result.offset + PAGE_SIZE)} className="rounded-xl border px-4 py-3 text-sm">Next</button></nav>}
    </section>
  </div>;
}
