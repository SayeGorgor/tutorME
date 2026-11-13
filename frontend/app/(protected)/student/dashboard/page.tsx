"use client";

import { useCurrentUser } from "@/lib/context/UserContext";
import BookingList from "@/components/BookingList";
import Link from "next/link";

export default function Dashboard() {
  const { user } = useCurrentUser();

  if (!user) return null;

  return (
    <div className="flex w-full min-w-0 flex-col gap-8 p-5 sm:p-8 lg:p-10">
      <header>
        <h1 className="text-3xl font-semibold">Welcome, {user.firstName}</h1>
        <p className="mt-2 text-slate-600">
          Manage your requests and genuine tutoring appointments.
        </p>
      </header>
      <section
        aria-labelledby="explore-tutors-heading"
        className="flex flex-col items-start gap-6 rounded-2xl border border-blue-200 bg-linear-to-br from-blue-100 via-blue-50 to-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8"
      >
        <div className="max-w-lg">
          <p className="mb-2 text-xs font-bold tracking-widest text-blue-700">YOUR NEXT STEP</p>
          <h2
            id="explore-tutors-heading"
            className="text-2xl font-semibold tracking-tight text-slate-900"
          >
            Find the right tutor for you.
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Explore subjects, compare tutors, and find support that fits your goals.
          </p>
        </div>
        <Link
          href="/tutors"
          className="group inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-3 rounded-xl bg-blue-700 px-6 py-3.5 font-semibold text-white shadow-lg shadow-blue-700/20 transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700 sm:w-auto"
        >
          Explore tutors
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="size-5 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </Link>
      </section>
      <BookingList compact />
    </div>
  );
}
