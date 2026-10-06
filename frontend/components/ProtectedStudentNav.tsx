'use client';

import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import Link from "next/link";
import MobileMenu from "./MobileMenu";

export default function ProtectedStudentNav() {
    const router = useRouter();
    const pathname = usePathname();

    const isActive = (href: string) => {
        return pathname === href ? "bg-indigo-500" : "hover:bg-indigo-500";
    };

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/");
    };

    const links = (
            <ul className="flex flex-col gap-2 w-full [&_a]:min-h-11 [&_button]:min-h-11">
                <li><Link className={`block p-2 w-full text-white rounded-lg ${isActive("/student/dashboard")}`} href="/student/dashboard">Dashboard</Link></li>
                <li><Link className={`block p-2 w-full text-white rounded-lg ${isActive("/student/sessions")}`} href="/student/sessions">My Sessions</Link></li>
                <li><Link className={`block p-2 w-full text-white rounded-lg ${isActive("/student/messages")}`} href="/student/messages">Messages</Link></li>
                <li><Link className={`block p-2 w-full text-white rounded-lg ${isActive("/student/saved-tutors")}`} href="/student/saved-tutors">Saved Tutors</Link></li>
                <li><Link className={`block p-2 w-full text-white rounded-lg ${isActive("/student/payments")}`} href="/student/payments">Payments</Link></li>
                <li><Link className={`block p-2 w-full text-white rounded-lg ${isActive("/student/settings")}`} href="/student/settings">Settings</Link></li>
                <li><button onClick={handleLogout} className="block p-2 w-full text-white text-left cursor-pointer rounded-lg hover:bg-indigo-500">Log Out</button></li>
            </ul>
    );

    return (
        <nav aria-label="Account navigation" className="relative flex w-full shrink-0 flex-col gap-0 bg-slate-900 p-4 text-white sm:p-6 lg:sticky lg:top-0 lg:h-dvh lg:w-full lg:gap-6 lg:overflow-y-auto lg:items-start">
            <h1 id="logo" className="absolute top-4 text-[1.8rem] text-white font-sans sm:top-6 lg:static lg:ml-2">
                tutorME
            </h1>
            <div className="hidden w-full lg:block">{links}</div>
            <MobileMenu>{links}</MobileMenu>
        </nav>
    )
}
