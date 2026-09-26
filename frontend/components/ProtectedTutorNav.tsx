'use client';

import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
export default function ProtectedTutorNav() {
    const router = useRouter();

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/");
    };
    return (
        <nav className="flex flex-col gap-6 items-start p-6 w-1/6 bg-slate-900">
            <h1 id="logo" className="text-[1.8rem] text-white font-sans ml-2">
                tutorME
            </h1>
            <ul className="flex flex-col gap-2 w-full">
                <li><Link className="block p-2 w-full text-white rounded-lg hover:bg-indigo-500" href="/tutor/dashboard">Dashboard</Link></li>
                <li><Link className="block p-2 w-full text-white rounded-lg hover:bg-indigo-500" href="/tutor/profile">Profile</Link></li>
                <li><Link className="block p-2 w-full text-white rounded-lg hover:bg-indigo-500" href="/tutor/sessions">Schedule</Link></li>
                <li><Link className="block p-2 w-full text-white rounded-lg hover:bg-indigo-500" href="/tutor/messages">Messages</Link></li>
                <li><Link className="block p-2 w-full text-white rounded-lg hover:bg-indigo-500" href="/tutor/students">Students</Link></li>
                <li><Link className="block p-2 w-full text-white rounded-lg hover:bg-indigo-500" href="/tutor/payments">Earnings</Link></li>
                <li><Link className="block p-2 w-full text-white rounded-lg hover:bg-indigo-500" href="/tutor/settings">Settings</Link></li>
                <li><button onClick={handleLogout} className="block p-2 w-full text-white text-left rounded-lg cursor-pointer hover:bg-indigo-500">Log Out</button></li>
            </ul>
        </nav>
    )
}