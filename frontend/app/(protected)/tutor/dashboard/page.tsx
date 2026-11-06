"use client";
import { useCurrentUser } from "@/lib/context/UserContext";
import BookingList from "@/components/BookingList";
export default function Dashboard() {
  const {user,loading}=useCurrentUser();
  if(loading)return <p className="p-6">Loading dashboard...</p>;
  return <div className="flex w-full min-w-0 flex-col gap-8 p-5 sm:p-8 lg:p-10"><header><h1 className="text-3xl font-semibold">Welcome, {user?.firstName}</h1><p className="mt-2 text-slate-600">Manage your requests and genuine tutoring appointments.</p></header><BookingList compact /></div>;
}
