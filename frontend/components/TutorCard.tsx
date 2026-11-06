import Image from "next/image";
import Link from "next/link";
import type { TutorSearchItem } from "@/lib/types";
import TutorLocationBadges from "./TutorLocationBadges";

export default function TutorCard({ tutor }: { tutor: TutorSearchItem }) {
  return <article className="surface flex min-w-0 flex-col gap-5 rounded-2xl bg-white p-5 hover:shadow-lg sm:flex-row sm:p-6">
    <Image src="/icons/default_pfp_icon.svg" alt="" width={112} height={112} className="h-28 w-28 shrink-0 self-start rounded-2xl bg-blue-100 object-cover" />
    <div className="flex min-w-0 flex-1 flex-col gap-3">{tutor.isDemo && <span className="demo-badge self-start">Demo Profile</span>}<h2 className="text-xl font-semibold">{tutor.user.firstName} {tutor.user.lastName}</h2>
      <TutorLocationBadges tutor={tutor} />
      <p className="text-sm text-slate-600">{tutor.subjects.length ? tutor.subjects.map(s => s.name).join(" / ") : "Subjects not listed yet"}</p>
      {tutor.intro && <p className="line-clamp-2 text-sm text-slate-600">{tutor.intro}</p>}
      {tutor.inPersonEnabled && tutor.serviceArea && tutor.distanceMiles !== null && <p className="text-sm text-slate-600">~{tutor.distanceMiles} miles straight-line{tutor.inPersonMatch ? " / Within travel range" : ""}</p>}
    </div>
    <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end"><p className="text-xl font-semibold">${tutor.price}<span className="text-sm font-normal text-slate-500"> / hr</span></p><Link href={`/tutors/${tutor.userId}`} className="rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-blue-800">View profile</Link></div>
  </article>;
}
