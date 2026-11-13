"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/context/UserContext";
import AccountLoading from "./AccountLoading";

/** Only essential identity data gates content; resources load independently. */
export default function AccountBoundary({ children }: { children: React.ReactNode }) {
  const account = useCurrentUser();
  const router = useRouter();
  useEffect(() => {
    if (account.status === "registration-incomplete") router.replace("/complete-registration");
  }, [account.status, router]);

  if (account.status === "ready") return children;
  if (account.status === "loading" || account.status === "registration-incomplete") {
    return <AccountLoading text={account.status === "registration-incomplete" ? "Opening account setup..." : undefined} />;
  }
  return <div className="flex min-h-80 w-full flex-col items-center justify-center gap-4 p-6 text-center">
    <p role="alert">{account.message}</p>
    <div className="flex flex-wrap justify-center gap-4">
      {account.status === "error" && <button type="button" onClick={account.retry} className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">Retry</button>}
      <Link href="/login" className="self-center text-blue-700 underline">Sign in again</Link>
    </div>
  </div>;
}
