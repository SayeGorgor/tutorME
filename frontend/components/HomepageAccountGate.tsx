"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getRegistrationStatus } from "@/lib/api/registration";

/** Session detection stays on the server; application roles come from the backend. */
export default function HomepageAccountGate({ sessionError = false }: { sessionError?: boolean }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (sessionError) return;
    let active = true;
    const timer = setTimeout(() => {
      active = false;
      setMessage("Account details are taking too long to load. Please retry.");
    }, 15000);
    void (async () => {
      try {
        const { data, error } = await getRegistrationStatus();
        if (!active) return;
        clearTimeout(timer);
        if (error) {
          setMessage(error.status === 401
            ? "Your session could not be verified. Retry or sign in again."
            : "Account details could not load. Please retry.");
          return;
        }
        if (data?.status === "complete") {
          if (data.role === "student") router.replace("/student/dashboard");
          else if (data.role === "tutor") router.replace("/tutor/dashboard");
          else if (data.role === "admin") router.replace("/account/settings");
          else setMessage("Your account role could not be resolved. Please retry or open account settings.");
        } else if (data?.status === "needs_completion" || data?.status === "PROVIDER_EMAIL_UNAVAILABLE" || data?.status === "PROVIDER_NAME_UNAVAILABLE") {
          router.replace("/complete-registration");
        } else if (data?.status === "EMAIL_VERIFICATION_REQUIRED") {
          router.replace("/verify-email");
        } else {
          setMessage("Account details could not be resolved. Please retry.");
        }
      } catch {
        if (active) {
          clearTimeout(timer);
          setMessage("Account details could not load. Please retry.");
        }
      }
    })();
    return () => { active = false; clearTimeout(timer); };
  }, [attempt, router, sessionError]);

  const error = sessionError ? "Your session could not be checked. Please retry or sign in again." : message;
  return <main className="mx-auto flex max-w-xl flex-col gap-4 px-6 py-16">
    <p role="status" aria-live="polite">{error || "Redirecting to your account..."}</p>
    {error && <div className="flex flex-wrap gap-4">
      <button type="button" className="font-semibold text-blue-700 underline" onClick={() => {
        if (sessionError) router.refresh();
        else { setMessage(""); setAttempt(value => value + 1); }
      }}>Retry</button>
      <Link href="/login" className="text-blue-700 underline">Sign in again</Link>
      <Link href="/account/settings" className="text-blue-700 underline">Account settings</Link>
    </div>}
  </main>;
}
