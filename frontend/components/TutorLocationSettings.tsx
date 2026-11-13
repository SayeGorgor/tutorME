"use client";

import { useState } from "react";
import type { ServiceArea, TutorProfile } from "@/lib/types";
import ServiceAreaPicker from "./ServiceAreaPicker";
import { authorized } from "@/lib/api/authorized";
import SubjectsYouTeach from "./SubjectsYouTeach";

export default function TutorLocationSettings({
  tutor,
  onSaved,
}: {
  tutor: TutorProfile;
  onSaved: (tutor: TutorProfile) => void;
}) {
  const [online, setOnline] = useState(tutor.onlineEnabled);
  const [inPerson, setInPerson] = useState(tutor.inPersonEnabled);
  const [area, setArea] = useState<ServiceArea | null>(tutor.serviceArea);
  const [placeId, setPlaceId] = useState<string | undefined>();
  const [radius, setRadius] = useState(String(tutor.travelRadiusMiles));
  const [preferences, setPreferences] = useState(tutor.meetingPreferences || "");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <section className="location-ui surface flex min-w-0 flex-col gap-6 rounded-2xl bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold">How and where you teach</h2>
        <p className="text-sm text-slate-600">
          Choose your lesson formats. Your existing hourly rate applies to both.
        </p>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();

          if (saving) return;
          if (!online && !inPerson) {
            setMessage("Enable at least one tutoring mode.");

            return;
          }
          if (inPerson && (!area || !consent)) {
            setMessage("Choose a service area and confirm public area display.");

            return;
          }

          const parsedRadius = Number(radius);
          const validRadius =
            radius.trim() !== "" &&
            Number.isFinite(parsedRadius) &&
            parsedRadius >= 0 &&
            parsedRadius <= 100;

          if (inPerson && !validRadius) {
            setMessage("Enter a maximum travel distance from 0 to 100 miles.");

            return;
          }

          setSaving(true);
          setMessage("");

          try {
            const result = await authorized<TutorProfile>(
              `/api/tutors/user/${tutor.userId}/location`,
              "PUT",
              {
                onlineEnabled: online,
                inPersonEnabled: inPerson,
                serviceAreaId: inPerson ? area?.id : null,
                placeId: placeId || null,
                travelRadiusMiles: validRadius ? parsedRadius : tutor.travelRadiusMiles,
                meetingPreferences: preferences || null,
                publicAreaConsent: consent,
              },
            );

            if (result.error || !result.data) {
              setMessage(result.error?.message || "Unable to save preferences.");

              return;
            }

            onSaved(result.data);
            setMessage("Tutoring preferences saved.");
          } catch {
            setMessage("Unable to save preferences. Please try again.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <fieldset className="flex flex-wrap gap-5">
          <legend className="mb-2 text-sm font-medium">Lesson formats</legend>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} />
            Online
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inPerson}
              onChange={(e) => setInPerson(e.target.checked)}
            />
            In person
          </label>
        </fieldset>
        {inPerson && (
          <>
            <ServiceAreaPicker
              value={area}
              onChange={(value, id) => {
                setArea(value);
                setPlaceId(id);
                setConsent(false);
              }}
            />
            <label className="flex flex-col gap-2 text-sm font-medium">
              Maximum travel distance (miles)
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                required
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="max-w-40 border bg-white p-3"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Public meeting preferences (optional)
              <select
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                className="border bg-white p-3"
              >
                <option value="">No preference</option>
                {[
                  "Public libraries",
                  "Public cafes",
                  "Public campus spaces",
                  "Public libraries or cafes",
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1"
              />
              I agree to show this public city/ZIP service area and meeting preferences on my
              profile and map. This is not my home address.
            </label>
          </>
        )}
        <button
          disabled={saving}
          className="self-start rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white"
        >
          {saving ? "Saving..." : "Save lesson preferences"}
        </button>
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
      </form>
      <SubjectsYouTeach tutor={tutor} onSaved={onSaved} />
    </section>
  );
}
