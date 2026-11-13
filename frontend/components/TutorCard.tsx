import Image from "next/image";
import Link from "next/link";
import type { TutorSearchItem } from "@/lib/types";
import { subjectSummary } from "@/lib/subject-summary";
import TutorLocationBadges from "./TutorLocationBadges";

export default function TutorCard({ tutor }: { tutor: TutorSearchItem }) {
  return <article className="surface flex min-w-0 [overflow-wrap:anywhere] flex-col gap-5 rounded-2xl bg-white p-5 hover:shadow-lg sm:flex-row sm:p-6">
    <Image src="/icons/default_pfp_icon.svg" alt="" width={150} height={160} className="h-28 w-28 max-w-none shrink-0 self-start rounded-2xl bg-blue-100 object-cover sm:h-40 sm:w-[150px]" />
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold">{tutor.user.firstName} {tutor.user.lastName}</h2>
        {tutor.isDemo && <span className="demo-badge shrink-0">Demo Profile</span>}
      </div>
      <TutorLocationBadges tutor={tutor} distanceMiles={tutor.distanceMiles} />
      <p className="text-sm text-slate-600">{subjectSummary(tutor.subjects)}</p>
      {tutor.intro && <p className="line-clamp-2 text-sm text-slate-600">{tutor.intro}</p>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 md:shrink-0 md:flex-col md:items-end"><p className="text-xl font-semibold">${tutor.price}<span className="text-sm font-normal text-slate-500"> / hr</span></p><Link href={`/tutors/${tutor.userId}`} className="rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-blue-800">View profile</Link></div>
  </article>;
}
