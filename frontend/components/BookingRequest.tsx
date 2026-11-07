"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { TutorProfile, Booking } from "@/lib/types";
import type { PolicyInfo } from "@/lib/policies";
import { apiFetch } from "@/lib/api/api-helper";
import { authorized } from "@/lib/api/authorized";
import { canRequestSubject, moneyLabel, profileQuote } from "@/lib/booking-details";
import BookingDetails from "./BookingDetails";
import BookingNotice, { type BookingNoticeTone } from "./BookingNotice";
export default function BookingRequest({ tutor: initialTutor }: { tutor: TutorProfile }) {
  const [tutor, setTutor] = useState(initialTutor);
  const [subject, setSubject] = useState("");
  const [stale, setStale] = useState(false);
  const [submitted, setSubmitted] = useState<Booking | null>(null);
  const [policies, setPolicies] = useState<PolicyInfo | null>(null);
  const [mode, setMode] = useState(tutor.onlineEnabled ? "online" : "in-person");
  const [day, setDay] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<BookingNoticeTone>("info");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [key, setKey] = useState("");
  const quote = profileQuote(tutor.price);
  const hasSubject = canRequestSubject(tutor.subjects, subject);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  useEffect(() => { apiFetch<PolicyInfo>("/api/policies").then(r => setPolicies(r.data || null)); }, []);
  if (tutor.isDemo) return <aside className="location-ui surface rounded-2xl bg-white p-6"><span className="demo-badge">Demo Profile</span><p className="mt-3 text-sm">This fictional tutor is for demonstration only and cannot receive genuine appointments.</p></aside>;
  return <section className="location-ui surface flex flex-col gap-4 rounded-2xl bg-white p-6"><div><h2 className="text-xl font-semibold">Request an appointment</h2><p className="text-sm text-slate-600">One-hour lessons, subject to tutor approval. Pending requests do not hold a slot and expire at the start time. TutorME does not collect payments.</p></div>
    {!policies?.bookingsEnabled ? <BookingNotice tone={policies ? "warning" : "info"} title={policies ? "Bookings are temporarily unavailable" : "Checking booking availability"} message={policies ? "Appointments cannot be requested right now. Please check back soon." : "Please wait while we check whether appointments are available."} /> : <>
    <p className="text-sm">For self-managed adult students. Parents must not submit child information; minor bookings remain disabled. <Link href="/account/settings" className="underline">Review adult eligibility and Terms</Link>.</p>
    <label className="flex flex-col gap-2 text-sm">What subject do you need help with?
      <select required disabled={busy || !tutor.subjects.length} value={subject} onChange={e => {setSubject(e.target.value);setKey(crypto.randomUUID());setSubmitted(null);setMessage("");}} className="border bg-white p-3">
        <option value="">Choose a subject</option>{tutor.subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
    {!tutor.subjects.length && <BookingNotice tone="warning" message="This tutor has not configured any subjects yet. Appointments cannot be requested until they add the subjects they teach." />}
    {quote === null && <BookingNotice tone="warning" message="This tutor's hourly rate needs to be updated before you can request a session." />}
    {stale && <BookingNotice tone="warning" message="Booking details have changed. Refresh and review them before submitting." />}
    <button disabled={busy} className="self-start text-sm text-blue-700 underline" onClick={async () => {
      if (pending.current) return; pending.current=true;setBusy(true);
      try {
        const result = await apiFetch<TutorProfile>(`/api/tutors/user/${tutor.userId}`, {cache:"no-store"});
        if (!result.data) {setMessageTone("error");setMessage(result.error?.message || "Booking details could not be refreshed. Please retry.");return;}
        if ((mode === "online" && !result.data.onlineEnabled) || (mode === "in-person" && !result.data.inPersonEnabled)) {
          setMode(result.data.onlineEnabled ? "online" : "in-person");setSlots([]);setSelected("");
        }
        setTutor(result.data);setStale(false);setKey(crypto.randomUUID());setSubmitted(null);
        if (!canRequestSubject(result.data.subjects, subject)) setSubject("");
        setMessageTone("info");setMessage("Booking details refreshed. Review the subject and quote before submitting.");
      } finally {pending.current=false;setBusy(false);}
    }}>Refresh booking details</button>
    <div className="grid gap-3 sm:grid-cols-2"><label className="flex flex-col gap-2 text-sm">Lesson format<select disabled={busy} value={mode} onChange={e => {setMode(e.target.value);setSubmitted(null);setSlots([]);setSelected("");setKey("");setMessage("");}} className="border bg-white p-3">{tutor.onlineEnabled && <option value="online">Online</option>}{tutor.inPersonEnabled && <option value="in-person">In person</option>}</select></label><label className="flex flex-col gap-2 text-sm">Date ({zone})<input disabled={busy} type="date" required value={day} onChange={e => {setDay(e.target.value);setSubmitted(null);setSlots([]);setSelected("");setKey("");setMessage("");}} className="border bg-white p-3" /></label></div>
    <button disabled={!day || busy} className="self-start rounded-xl border border-blue-200 px-5 py-3 text-sm font-semibold text-blue-700" onClick={async () => { if (pending.current) return; pending.current=true; setBusy(true); try { const params = new URLSearchParams({day,mode,timezone:zone}); const r = await apiFetch<{slots:string[]}>(`/api/bookings/slots/${tutor.id}?${params}`); setSlots(r.data?.slots || []);setSelected("");setKey("");setMessageTone(r.error ? "error" : r.data?.slots.length ? "info" : "warning");setMessage(r.error?.message || (r.data?.slots.length ? "Select a time. It will be rechecked when requested and confirmed." : "No open one-hour times on this date."));} catch { setMessageTone("error");setMessage("Available times could not load. Please retry."); } finally { pending.current=false;setBusy(false); } }}>Check times</button>
    {slots.length > 0 && <label className="flex flex-col gap-2 text-sm">Start time<select disabled={busy} value={selected} onChange={e => {setSelected(e.target.value);setSubmitted(null);setKey(crypto.randomUUID());}} className="border bg-white p-3"><option value="">Choose a time</option>{slots.map(slot => <option key={slot} value={slot}>{new Date(slot).toLocaleString([], {dateStyle:"medium",timeStyle:"short"})}</option>)}</select></label>}
    <div className="rounded-xl border border-blue-200 p-4 text-sm">
      <h3 className="font-semibold">Review your session</h3>
      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {[["Tutor", `${tutor.user.firstName} ${tutor.user.lastName}`], ["Subject", tutor.subjects.find(item => String(item.id) === subject)?.name || "Choose a subject"], ["Format", mode === "online" ? "Online" : "In person"], ["Date and time", selected ? `${new Date(selected).toLocaleString([], {dateStyle:"medium",timeStyle:"short"})} (${zone})` : "Choose a date and time"], ["Duration", "60 minutes"], ["Hourly rate", moneyLabel(quote, "USD")], ["Quoted session amount", moneyLabel(quote, "USD")]].map(([label, value]) => <div key={label}><dt className="text-slate-600">{label}</dt><dd className="break-words font-medium">{value}</dd></div>)}
      </dl>
      <p className="mt-4 text-slate-600">Payment is arranged directly with the tutor. TutorME does not collect payment for this booking.</p>
    </div>
    <button disabled={!selected || !hasSubject || quote === null || stale || busy} className="self-start rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white" onClick={async () => {if (pending.current) return;pending.current=true;setBusy(true);try {const r = await authorized<Booking>("/api/bookings","POST",{tutorId:tutor.id,subjectId:Number(subject),expectedHourlyRate:quote,mode,startsAt:selected,idempotencyKey:key});if (r.data) setSubmitted(r.data);if (r.error?.code === "QUOTE_CHANGED" || r.error?.code === "SUBJECT_UNAVAILABLE") setStale(true);setMessageTone(r.error || !r.data ? "error" : "success");setMessage(r.error?.message || (r.data ? r.data.status === "pending" ? "Your request has been sent and is awaiting tutor approval. Check My sessions for updates; no booking email is sent." : `Your booking is ${r.data.status}. Check My sessions for details.` : "Your request could not be confirmed. Please check My sessions before retrying."));} catch { setMessageTone("error");setMessage("Your request could not be confirmed. Retry the same request or check My sessions."); } finally {pending.current=false;setBusy(false);} }}>{busy ? "Please wait..." : "Submit booking request"}</button>
    {submitted && <BookingDetails booking={submitted} />}
    <Link href="/login" className="text-sm underline">Sign in with an adult account to book</Link>
    </>}
    <BookingNotice message={message} tone={messageTone} />
  </section>;
}
