"use client";

import { useEffect, useRef, useState } from "react";
import type { Subject, TutorProfile } from "@/lib/types";
import { getSubjects, updateTutorProfile } from "@/lib/api/actions/client-actions";
import { authorized } from "@/lib/api/authorized";

export default function SubjectsYouTeach({ tutor, onSaved }: { tutor: TutorProfile; onSaved: (tutor: TutorProfile) => void }) {
  const [subjects, setSubjects] = useState<Subject[]>(tutor.subjects);
  const [selected, setSelected] = useState(tutor.subjects.map(subject => subject.id));
  const [customName, setCustomName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reload, setReload] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    getSubjects().then(result => {
      if (!active) return;
      if (result.error || !result.data) { setMessage("Subject choices could not load. Please retry."); return; }
      setSubjects(current => [...new Map([...current, ...result.data!].map(subject => [subject.id, subject])).values()]);
      setLoaded(true);
    }).catch(() => { if (active) setMessage("Subject choices could not load. Please retry."); });
    return () => { active = false; };
  }, [reload]);

  const addSubject = async () => {
    const name = customName.trim().replace(/\s+/g, " ");
    if (pending.current || !name) return;
    if (selected.length >= 50) { setMessage("Choose up to 50 subjects. Remove one before adding another."); return; }
    pending.current = true; setBusy(true); setMessage("");
    try {
      const result = await authorized<Subject>("/api/subjects/", "POST", { name });
      if (result.error || !result.data) { setMessage(result.error?.message || "Subject could not be added. Please retry."); return; }
      const subject = result.data;
      setSubjects(current => current.some(item => item.id === subject.id) ? current : [...current, subject]);
      setSelected(current => current.includes(subject.id) ? current : [...current, subject.id]);
      setCustomName("");
      setMessage("Subject selected. Save subjects to update your profile.");
    } catch { setMessage("Subject could not be added. Please retry."); }
    finally { pending.current = false; setBusy(false); }
  };

  return <form id="subjects-you-teach" className="flex scroll-mt-6 flex-col gap-3 border-t border-slate-200 pt-5" onSubmit={async event => {
    event.preventDefault();
    if (pending.current || !loaded) return;
    pending.current = true; setBusy(true); setMessage("");
    try {
      const result = await updateTutorProfile({ userId: tutor.userId, tutorProfileData: { subjectIds: selected } });
      if (result.data) { onSaved(result.data); setMessage("Subjects saved."); }
      else setMessage(result.error?.message || "Unable to save subjects. Please retry.");
    } catch { setMessage("Unable to save subjects. Please retry."); }
    finally { pending.current = false; setBusy(false); }
  }}>
    <fieldset disabled={busy}>
      <legend className="mb-3 font-semibold">Subjects you teach</legend>
      <div className="grid max-h-60 grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
        {[...subjects].sort((a, b) => a.name.localeCompare(b.name)).map(subject => <label key={subject.id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selected.includes(subject.id)} disabled={!selected.includes(subject.id) && selected.length >= 50} onChange={event => {
            setSelected(current => event.target.checked ? [...current, subject.id] : current.filter(id => id !== subject.id));
            setMessage("");
          }} />{subject.name}
        </label>)}
      </div>
    </fieldset>
    {!loaded && <button type="button" disabled={busy} className="self-start text-sm text-blue-700 underline" onClick={() => { setMessage(""); setReload(value => value + 1); }}>Reload subject choices</button>}
    <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3">
      <label htmlFor="custom-teaching-subject" className="text-sm font-medium">Don&apos;t see your subject? Add it</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id="custom-teaching-subject" disabled={busy} maxLength={100} value={customName} onChange={event => setCustomName(event.target.value)} onKeyDown={event => {
          if (event.key === "Enter") { event.preventDefault(); void addSubject(); }
        }} placeholder="e.g. Music theory" className="min-w-0 flex-1 rounded-lg border p-2 text-sm" />
        <button type="button" disabled={busy || !customName.trim()} onClick={() => void addSubject()} className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700">Add subject</button>
      </div>
    </div>
    <button disabled={busy || !loaded} className="self-start rounded-xl border border-blue-200 px-5 py-3 text-sm font-semibold text-blue-700">{busy ? "Saving..." : "Save subjects"}</button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </form>;
}
