"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Booking } from "@/lib/types";
import { authorized } from "@/lib/api/authorized";
import { useCurrentUser } from "@/lib/context/UserContext";
import { bookingDisplayStatus } from "@/lib/booking-status";
import BookingDetails from "./BookingDetails";
import BookingNotice, { type BookingNoticeTone } from "./BookingNotice";
function MeetingForm({ booking, onSaved }: { booking: Booking; onSaved: (booking: Booking) => void }) {
  const [details, setDetails] = useState(booking.meetingDetails || "");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<BookingNoticeTone>("info");
  const [busy, setBusy] = useState(false);
  return <form className="mt-3 flex flex-col gap-3 border-t border-slate-200 pt-4" onSubmit={async event => {event.preventDefault();setBusy(true);const r=await authorized<Booking>(`/api/bookings/${booking.id}/meeting`,"PUT",{details,publicMeetingConfirmed:confirmed});if(r.data)onSaved(r.data);setMessageTone(r.error ? "error" : "success");setMessage(r.error?.message || "Private meeting details saved. Only you and the student can see them.");setBusy(false);}}><label className="flex flex-col gap-2 text-sm">{booking.mode === "online" ? "Private HTTPS meeting URL" : "Approved public meeting details"}<input required maxLength={1000} type={booking.mode === "online" ? "url" : "text"} value={details} onChange={e=>setDetails(e.target.value)} className="border bg-white p-3" /></label>{booking.mode === "in-person" && <label className="flex gap-2 text-sm"><input required type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} />This is an approved public venue, not a residential address.</label>}<button disabled={busy} className="self-start rounded-lg border px-3 py-2 text-sm">Save private details</button><BookingNotice message={message} tone={messageTone} /></form>;
}
export default function BookingList({ compact = false }: { compact?: boolean }) {
  const { user } = useCurrentUser();
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [records, setRecords] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<BookingNoticeTone>("info");
  const [busy, setBusy] = useState(false);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const limit = compact ? 5 : 50;
  useEffect(()=>{let active=true;authorized<Booking[]>(`/api/bookings?limit=${limit}&offset=${offset}`).then(r=>{if(active){setRecords(r.data||[]);setNow(Date.now());setMessageTone(r.error ? "error" : "info");setFeedbackFor(null);setMessage(r.error?.message||"");setLoading(false);}});return()=>{active=false;};},[limit,offset]);
  const replace = (booking: Booking) => setRecords(items=>items.map(item=>item.id===booking.id?booking:item));
  const action = async (booking: Booking, action: string) => {setFeedbackFor(booking.id);setMessage("");setBusy(true);const r=await authorized<Booking>(`/api/bookings/${booking.id}/status`,"POST",{action});if(r.data)replace(r.data);setMessageTone(r.error || !r.data ? "error" : "success");setMessage(r.error?.message || (r.data ? `Booking ${r.data.status}. The appointment record has been updated.` : "The booking update could not be confirmed. Please retry."));setBusy(false);};
  return <section className="location-ui touch-controls flex min-w-0 flex-col gap-4 [overflow-wrap:anywhere]"><div><h2 className="text-xl font-semibold">Your appointments</h2><p className="text-sm text-slate-600">Pending requests require tutor approval and expire at their start time. They do not hold a slot. Check here for updates; booking emails are not sent.</p></div>{loading && <p role="status">Loading appointments...</p>}{!feedbackFor && <BookingNotice message={message} tone={messageTone} />}{!loading && !records.length && <div className="surface rounded-2xl bg-white p-6"><p>No appointment records yet.</p>{user?.role === "student" && <Link href="/tutors" className="text-sm text-blue-700 underline">Explore tutors</Link>}</div>}
    <ul className="flex flex-col gap-4">{records.map(booking=>{const status=bookingDisplayStatus(booking,now);const tutor=user?.role==="tutor";const future=new Date(booking.startsAt).getTime()>now;return <li key={booking.id} className="surface min-w-0 rounded-2xl bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{tutor?booking.studentName:booking.tutorName}</h3><p className="text-sm">{new Date(booking.startsAt).toLocaleString([], {dateStyle:"medium",timeStyle:"short"})} - {new Date(booking.endsAt).toLocaleTimeString([], {timeStyle:"short"})}</p><p className="text-sm text-slate-600">{booking.mode} / Displayed in your device time zone</p></div><span className={`rounded-full border px-3 py-1.5 text-sm font-semibold capitalize ${status === "confirmed" || status === "completed" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : status === "pending" ? "border-amber-200 bg-amber-50 text-amber-900" : status === "declined" ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-slate-100 text-slate-700"}`}>{status === "pending" ? "Awaiting approval" : status}</span></div>
      <BookingDetails booking={{...booking, status}} />
      {status==="confirmed" && <p className="mt-3 break-all text-sm">Private meeting details: {booking.meetingDetails || "The tutor has not provided meeting details yet."}</p>}
      {feedbackFor === booking.id && message && <div className="mt-4"><BookingNotice message={message} tone={messageTone} /></div>}
      <div className="session-actions mt-4 flex flex-wrap gap-2">{tutor && status==="pending" && future && <><button disabled={busy} className="rounded-lg bg-blue-700 px-3 py-2 text-sm text-white" onClick={()=>action(booking,"confirm")}>Accept request</button><button disabled={busy} className="rounded-lg border px-3 py-2 text-sm" onClick={()=>action(booking,"decline")}>Decline</button></>}{["pending","confirmed"].includes(status) && future && <button disabled={busy} className="rounded-lg border px-3 py-2 text-sm" onClick={()=>action(booking,"cancel")}>Cancel appointment</button>}{tutor && status==="confirmed" && new Date(booking.endsAt).getTime()<=now && <button disabled={busy} className="rounded-lg border px-3 py-2 text-sm" onClick={()=>action(booking,"complete")}>Mark completed</button>}</div>
      {tutor && status==="confirmed" && !compact && <MeetingForm booking={booking} onSaved={replace} />}
    </li>;})}</ul>
    {!compact && <nav aria-label="Appointment history pages" className="flex flex-wrap gap-3"><button disabled={offset===0||busy} onClick={()=>setOffset(Math.max(0,offset-limit))} className="rounded-lg border px-4 py-2 text-sm">Previous</button><button disabled={records.length<limit||busy} onClick={()=>setOffset(offset+limit)} className="rounded-lg border px-4 py-2 text-sm">Next</button></nav>}
    {compact && <Link href={user?.role==="tutor"?"/tutor/sessions":"/student/sessions"} className="text-sm underline">View all appointments and history</Link>}
  </section>;
}
