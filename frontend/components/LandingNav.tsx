import Link from "next/link";
import MobileMenu from "./MobileMenu";
import TutorMELogo from "./TutorMELogo";

export default function LandingNav() {
  const links = <>
    <Link href="/#how-it-works" className="rounded-lg px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-800">How it works</Link>
    <Link href="/signup/tutor" className="rounded-lg px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-800">Become a tutor</Link>
    <Link href="/login" className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">Log in</Link>
    <Link href="/signup" className="rounded-xl bg-blue-800 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-blue-900">Get started <span aria-hidden="true">?</span></Link>
  </>;
  return <nav aria-label="Main navigation" className="relative z-30 flex w-full flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-white px-5 py-4 sm:px-8 lg:px-12">
    <Link href="/" aria-label="tutorME home" className="absolute top-4 flex h-11 items-center gap-2 text-2xl font-bold tracking-tighter text-slate-900 lg:static">
      <TutorMELogo />
    </Link>
    <div className="hidden items-center gap-1 lg:flex">{links}</div>
    <div className="w-full lg:hidden"><MobileMenu>{links}</MobileMenu></div>
  </nav>;
}
