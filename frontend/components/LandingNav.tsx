"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { getCurrentUser } from "@/lib/api/actions/client-actions";
import type { UserRole } from "@/lib/types";
import MobileMenu from "./MobileMenu";
import TutorMELogo from "./TutorMELogo";

function SessionLandingNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const subject = session?.user.id;
  const [account, setAccount] = useState<{ subject: string; role?: UserRole; incomplete?: boolean; error?: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!subject) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sequence = 0;
    const loadAccount = async (attempt = 0) => {
      const current = ++sequence;
      const result = await getCurrentUser();
      if (!active || current !== sequence) return;
      if (result.data) {
        setAccount({ subject, role: result.data.role });
      } else if (result.error?.code === "REGISTRATION_INCOMPLETE") {
        setAccount({ subject, incomplete: true });
      } else {
        setAccount({ subject, error: true });
        if (attempt < 2) timer = setTimeout(() => void loadAccount(attempt + 1), 750 * (attempt + 1));
      }
    };
    const refreshAccount = () => { clearTimeout(timer); void loadAccount(); };
    void loadAccount();
    window.addEventListener("focus", refreshAccount);
    return () => { active = false; clearTimeout(timer); window.removeEventListener("focus", refreshAccount); };
  }, [subject, pathname, retry]);
  const currentAccount = account?.subject === subject ? account : null;
  const complete = currentAccount?.role;
  const logoHref = !subject ? "/" : complete === "student" ? "/student/dashboard" : complete === "tutor" ? "/tutor/dashboard" : currentAccount?.incomplete ? "/complete-registration" : "/account/settings";
  const sessions = complete === "tutor" ? "/tutor/sessions" : "/student/sessions";
  const linkClass = "rounded-lg px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-800";
  const links = isPending ? <span role="status" className="px-4 py-3 text-sm text-slate-500">Loading account...</span> : subject ? <>
    {complete ? <>
      <Link href={sessions} className={linkClass}>My sessions</Link>
      <Link href="/account/settings" className={linkClass}>Settings</Link>
    </> : <Link href={currentAccount?.incomplete ? "/complete-registration" : "/account/settings"} className={linkClass}>{currentAccount?.incomplete ? "Finish account setup" : "My account"}</Link>}
    <button type="button" disabled={signingOut} className={linkClass} onClick={async () => {
      if (signingOut) return;
      setSigningOut(true); setMessage("");
      try {
        const result = await authClient.signOut();
        if (result.error) { setMessage("Could not log out. Please try again."); return; }
        setAccount(null); router.replace("/"); router.refresh();
      } catch { setMessage("Could not log out. Please try again."); }
      finally { setSigningOut(false); }
    }}>{signingOut ? "Logging out..." : "Log out"}</button>
  </> : <PublicLinks />;
  return <nav aria-label="Main navigation" className="landing-nav relative z-30 flex w-full flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-white px-5 py-4 sm:px-8 lg:px-12">
    <Link href={logoHref} aria-label={subject ? "tutorME dashboard" : "tutorME home"} className="flex min-h-11 items-center gap-2 text-2xl font-bold tracking-tighter text-slate-900 lg:static">
      <TutorMELogo />
    </Link>
    <div className="hidden items-center gap-1 lg:flex">{links}</div>
    <div className="min-w-0 grow basis-24 lg:hidden"><MobileMenu>{links}</MobileMenu></div>
    {subject && currentAccount?.error && <p role="status" className="w-full text-sm text-slate-600">Account links could not load. <button type="button" className="font-semibold text-blue-700 underline" onClick={() => setRetry(value => value + 1)}>Retry</button> or <Link href="/login" className="font-semibold text-blue-700 underline">sign in again</Link>.</p>}
    {message && <p role="alert" className="w-full text-sm text-red-600">{message}</p>}
  </nav>;
}

function PublicLinks() {
  return <>
    <Link href="/#how-it-works" className="rounded-lg px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-800">How it works</Link>
    <Link href="/signup/tutor" className="rounded-lg px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-800">Become a tutor</Link>
    <Link href="/login" className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">Log in</Link>
    <Link href="/signup" className="rounded-xl bg-blue-800 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-blue-900">Get started <span aria-hidden="true">?</span></Link>
  </>;
}

function PublicLandingNav() {
  return <nav aria-label="Main navigation" className="landing-nav relative z-30 flex w-full flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-white px-5 py-4 sm:px-8 lg:px-12">
    <Link href="/" aria-label="tutorME home" className="flex min-h-11 items-center gap-2 text-2xl font-bold tracking-tighter text-slate-900 lg:static"><TutorMELogo /></Link>
    <div className="hidden items-center gap-1 lg:flex"><PublicLinks /></div>
    <div className="min-w-0 grow basis-24 lg:hidden"><MobileMenu><PublicLinks /></MobileMenu></div>
  </nav>;
}

export default function LandingNav() {
  const pathname = usePathname();
  return pathname === "/" ? <PublicLandingNav /> : <SessionLandingNav />;
}
