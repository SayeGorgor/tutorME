'use client';

import Link from "next/link";
import MobileMenu from "./MobileMenu";
import TutorMELogo from "./TutorMELogo";
import { authClient } from "@/lib/auth/client";
import { useRouter, usePathname } from "next/navigation";
export default function ProtectedTutorNav() {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/");
    };

    const isActive = (href: string) => {
        return pathname === href ? "bg-white/15 shadow-sm" : "hover:bg-white/10";
    };

    const links = (
            <ul className="flex flex-col gap-2 w-full [&_a]:min-h-11 [&_button]:min-h-11">
                <li><Link className={`block p-2 w-full text-white rounded-lg ${isActive("/tutor/dashboard")}`} href="/tutor/dashboard">Dashboard</Link></li>
                <li><Link className={`block p-2 w-full text-white rounded-lg ${isActive("/tutor/profile")}`} href="/tutor/profile">Profile</Link></li>
                <li><Link className={`block p-2 w-full text-white rounded-lg ${isActive("/tutor/sessions")}`} href="/tutor/sessions">Schedule</Link></li>
                <li><Link className={`block p-2 w-full text-white rounded-lg ${isActive("/tutor/students")}`} href="/tutor/students">Students</Link></li>
                <li><Link className={`block p-2 w-full text-white rounded-lg ${isActive("/tutor/payments")}`} href="/tutor/payments">Earnings</Link></li>
                <li><Link className={`block p-2 w-full text-white rounded-lg ${isActive("/account/settings")}`} href="/account/settings">Settings</Link></li>
                <li><button onClick={handleLogout} className="block p-2 w-full text-white text-left rounded-lg cursor-pointer hover:bg-indigo-500">Log Out</button></li>
            </ul>
    );

    return (
        <nav aria-label="Account navigation" className="account-nav relative flex w-full shrink-0 flex-col gap-0 bg-slate-900 p-4 text-white sm:p-6 lg:sticky lg:top-0 lg:h-dvh lg:w-full lg:gap-6 lg:overflow-y-auto lg:items-start">
            <h1 id="logo" className="absolute top-4 text-[1.8rem] text-white font-sans sm:top-6 lg:static lg:ml-2">
                <TutorMELogo inverse />
            </h1>
            <div className="hidden w-full lg:block">{links}</div>
            <MobileMenu>{links}</MobileMenu>
        </nav>
    )
}
