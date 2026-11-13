"use client";

import { useId, useRef, useState } from "react";
import type { TutorProfile } from "@/lib/types";
import { updateTutorProfile } from "@/lib/api/actions/client-actions";

export default function TutorRateEditor({
  tutor,
  onSaved,
}: {
  tutor: TutorProfile;
  onSaved: (tutor: TutorProfile) => void;
}) {
  const id = useId();

  const [editing, setEditing] = useState(false);
  const [rate, setRate] = useState(String(tutor.price));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const pending = useRef(false);

  if (!editing)
    return (
      <div className="touch-controls flex min-w-0 flex-col items-start gap-2 xl:items-end">
        <p className="text-lg text-gray-600">
          <span className="text-2xl font-bold text-slate-900">${tutor.price}</span> / hr
        </p>
        <button
          type="button"
          className="text-sm font-semibold text-blue-700 hover:underline"
          onClick={() => {
            setRate(String(tutor.price));
            setMessage("");
            setEditing(true);
          }}
        >
          Edit hourly rate
        </button>
      </div>
    );

  return (
    <form
      className="touch-controls flex min-w-0 w-full max-w-xs flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();

        if (pending.current) return;

        const price = Number(rate);

        if (
          !rate.trim() ||
          !Number.isFinite(price) ||
          price < 0 ||
          price > 10000 ||
          !/^\d+(\.\d{1,2})?$/.test(rate)
        ) {
          setMessage("Enter a rate from $0 to $10,000 with up to two decimal places.");

          return;
        }

        pending.current = true;
        setBusy(true);
        setMessage("");

        try {
          const result = await updateTutorProfile({
            userId: tutor.userId,
            tutorProfileData: { price },
          });

          if (result.error || !result.data) {
            setMessage(result.error?.message || "Your rate could not be saved. Please retry.");

            return;
          }

          onSaved(result.data);
          setEditing(false);
        } catch {
          setMessage("Your rate could not be saved. Please retry.");
        } finally {
          pending.current = false;
          setBusy(false);
        }
      }}
    >
      <label htmlFor={id} className="text-sm font-semibold">
        Hourly rate (USD)
      </label>
      <div className="flex items-center gap-2">
        <span aria-hidden="true">$</span>
        <input
          id={id}
          required
          disabled={busy}
          type="number"
          min="0"
          max="10000"
          step="0.01"
          inputMode="decimal"
          value={rate}
          onChange={(event) => {
            setRate(event.target.value);
            setMessage("");
          }}
          className="min-w-0 w-28 rounded-lg border bg-white p-2"
        />
        <span>/ hr</span>
      </div>
      <div className="flex gap-4 text-sm font-semibold">
        <button disabled={busy} type="submit" className="text-blue-700 hover:underline">
          {busy ? "Saving..." : "Save rate"}
        </button>
        <button
          disabled={busy}
          type="button"
          className="text-slate-600 hover:underline"
          onClick={() => {
            setEditing(false);
            setMessage("");
          }}
        >
          Cancel
        </button>
      </div>
      {message && (
        <p role="alert" className="text-sm text-red-600">
          {message}
        </p>
      )}
    </form>
  );
}
