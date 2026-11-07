import type { TutorProfile } from "@/lib/types";
import { areaLabel } from "@/lib/service-area-label";

export default function TutorLocationBadges({ tutor, distanceMiles }: { tutor: Pick<TutorProfile, "onlineEnabled" | "inPersonEnabled" | "serviceArea">; distanceMiles?: number | null }) {
  const mode = tutor.onlineEnabled && tutor.inPersonEnabled ? "Online + In Person" : tutor.inPersonEnabled ? "In Person" : "Online";
  return <div className="flex flex-wrap gap-2 text-sm font-semibold">
    <span className="max-w-full [overflow-wrap:anywhere] rounded-full bg-blue-200 px-3 py-1 text-blue-800">{mode}</span>
    {tutor.inPersonEnabled && tutor.serviceArea && <span className="max-w-full [overflow-wrap:anywhere] rounded-full border border-blue-200 bg-white/70 px-3 py-1 text-blue-800">{areaLabel(tutor.serviceArea)}{distanceMiles != null && Number.isFinite(distanceMiles) && <> &middot; {distanceMiles} mi</>}</span>}
  </div>;
}
