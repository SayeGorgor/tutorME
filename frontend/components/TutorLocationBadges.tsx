import type { TutorProfile } from "@/lib/types";
import { areaLabel } from "@/lib/service-area-label";

export default function TutorLocationBadges({ tutor }: { tutor: Pick<TutorProfile, "onlineEnabled" | "inPersonEnabled" | "serviceArea"> }) {
  const mode = tutor.onlineEnabled && tutor.inPersonEnabled ? "Online + In Person" : tutor.inPersonEnabled ? "In Person" : "Online";
  return <div className="flex flex-wrap gap-2 text-sm font-semibold">
    <span className="w-fit rounded-full bg-blue-200 px-3 py-1 text-blue-800">{mode}</span>
    {tutor.inPersonEnabled && tutor.serviceArea && <span className="w-fit rounded-full border border-blue-200 bg-white/70 px-3 py-1 text-blue-800">{areaLabel(tutor.serviceArea)}</span>}
  </div>;
}
