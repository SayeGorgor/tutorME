"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { TutorProfile, Booking } from "@/lib/types";
import type { PolicyInfo } from "@/lib/policies";
import { apiFetch } from "@/lib/api/api-helper";
import { authorized } from "@/lib/api/authorized";
export default function BookingRequest({ tutor }: { tutor: TutorProfile }) {
  const [policies, setPolicies] = useState<PolicyInfo | null>(null);
  const [mode, setMode] = useState(tutor.onlineEnabled ? "online" : "in-person");
  const [day, setDay] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState("");
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  useEffect(() => { apiFetch<PolicyInfo>("/api/policies").then(r => setPolicies(r.data || null)); }, []);
  if (tutor.isDemo) return <aside className="location-ui surface rounded-2xl bg-white p-6"><span className="demo-badge">Demo Profile</span><p className="mt-3 text-sm">This fictional tutor is for demonstration only and cannot receive genuine appointments.</p></aside>;
  return <section className="location-ui surface flex flex-col gap-4 rounded-2xl bg-white p-6"><div><h2 className="text-xl font-semibold">Request an appointment</h2><p className="text-sm text-slate-600">One-hour lessons, subject to tutor approval. ${tutor.price}/hour is the tutor-listed rate. TutorME does not collect payments.</p></div>
    {!policies?.bookingsEnabled ? <p role="status">Real booking is awaiting operator configuration and policy publication.</p> : <>
    <p className="text-sm">For self-managed adult students. Parents must not submit child information; minor bookings remain disabled. <Link href="/account/settings" className="underline">Review adult eligibility and Terms</Link>.</p>
    <div className="grid gap-3 sm:grid-cols-2"><label className="flex flex-col gap-2 text-sm">Lesson format<select value={mode} onChange={e => {setMode(e.target.value);setSlots([]);setSelected("");setKey("");}} className="border bg-white p-3">{tutor.onlineEnabled && <option value="online">Online</option>}{tutor.inPersonEnabled && <option value="in-person">In person</option>}</select></label><label className="flex flex-col gap-2 text-sm">Date ({zone})<input type="date" required value={day} onChange={e => {setDay(e.target.value);setSlots([]);setSelected("");setKey("");}} className="border bg-white p-3" /></label></div>
    <button disabled={!day || busy} className="self-start rounded-xl border border-blue-200 px-5 py-3 text-sm font-semibold text-blue-700" onClick={async () => { setBusy(true); const params = new URLSearchParams({day,mode,timezone:zone}); const r = await apiFetch<{slots:string[]}>(`/api/bookings/slots/${tutor.id}?${params}`); setSlots(r.data?.slots || []);setSelected("");setKey("");setMessage(r.error?.message || (r.data?.slots.length ? "Select a time. It will be rechecked when requested and confirmed." : "No open one-hour times on this date."));setBusy(false); }}>Check times</button>
    {slots.length > 0 && <label className="flex flex-col gap-2 text-sm">Start time<select value={selected} onChange={e => {setSelected(e.target.value);setKey(crypto.randomUUID());}} className="border bg-white p-3"><option value="">Choose a time</option>{slots.map(slot => <option key={slot} value={slot}>{new Date(slot).toLocaleString([], {dateStyle:"medium",timeStyle:"short"})}</option>)}</select></label>}
    <button disabled={!selected || busy} className="self-start rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white" onClick={async () => {setBusy(true);const r = await authorized<Booking>("/api/bookings","POST",{tutorId:tutor.id,mode,startsAt:selected,idempotencyKey:key});setMessage(r.error?.message || `Request ${r.data?.status}. Check My sessions for updates; no booking email is sent.`);setBusy(false);}}>Submit booking request</button>
    <Link href="/login" className="text-sm underline">Sign in with an adult account to book</Link>
    </>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
