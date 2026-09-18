import Link from "next/link";

export default function ProtectedStudentNav() {
    return (
        <nav className="flex flex-col gap-6 items-start p-6 w-1/6 bg-slate-900">
            <h1 id="logo" className="text-[1.8rem] text-white font-sans ml-2">
                tutorME
            </h1>
            <ul className="flex flex-col gap-2 w-full">
                <li><Link className="block p-2 w-full text-white rounded-lg hover:bg-indigo-500" href="/student/dashboard">Dashboard</Link></li>
                <li><Link className="block p-2 w-full text-white rounded-lg hover:bg-indigo-500" href="/student/sessions">My Sessions</Link></li>
                <li><Link className="block p-2 w-full text-white rounded-lg hover:bg-indigo-500" href="/student/messages">Messages</Link></li>
                <li><Link className="block p-2 w-full text-white rounded-lg hover:bg-indigo-500" href="/student/saved-tutors">Saved Tutors</Link></li>
                <li><Link className="block p-2 w-full text-white rounded-lg hover:bg-indigo-500" href="/student/payments">Payments</Link></li>
                <li><Link className="block p-2 w-full text-white rounded-lg hover:bg-indigo-500" href="/student/settings">Settings</Link></li>
            </ul>
        </nav>
    )
}