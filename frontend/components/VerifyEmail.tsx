"use client";

import { useState, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { authPageClass, authFormClass } from "./auth-layout";

function subscribeToEmail(callback: () => void) {
  window.addEventListener("storage", callback);

  return () => window.removeEventListener("storage", callback);
}

function savedVerificationEmail() {
  try {
    return sessionStorage.getItem("tutorme:verification-email") || "";
  } catch {
    return "";
  }
}

export default function VerifyEmail() {
  const savedEmail = useSyncExternalStore(subscribeToEmail, savedVerificationEmail, () => "");

  const [enteredEmail, setEmail] = useState<string | null>(null);

  const email = enteredEmail ?? savedEmail;

  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const pending = useRef(false);

  return (
    <main className={authPageClass}>
      <form
        className={authFormClass}
        onChange={() => setMessage("")}
        onSubmit={async (event) => {
          event.preventDefault();

          if (pending.current) return;

          pending.current = true;
          setBusy(true);

          try {
            const result = await authClient.emailOtp.verifyEmail({
              email: email.trim(),
              otp: code.trim(),
            });

            setMessage(
              result.error?.message || "Email verified. Sign in again, then finish account setup.",
            );
          } catch {
            setMessage(
              "Verification could not be confirmed. Please retry or use the provider's verification link.",
            );
          } finally {
            pending.current = false;
            setBusy(false);
          }
        }}
      >
        <h1 className="text-3xl font-semibold">Verify your email</h1>
        <p className="text-sm text-slate-600">
          Use the code sent by your sign-in provider. If your project uses verification links, open
          the email link instead, then return to sign in. This does not create another identity.
        </p>
        <label className="flex flex-col gap-2 text-sm">
          Sign-in email
          <input
            required
            disabled={busy}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-3"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Verification code
          <input
            required
            disabled={busy}
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="border p-3"
          />
        </label>
        <button disabled={busy} className="rounded-xl bg-blue-700 p-3 font-semibold text-white">
          Verify code
        </button>
        <button
          type="button"
          disabled={busy || !email}
          className="rounded-xl border p-3 text-sm"
          onClick={async (event) => {
            if (pending.current) return;
            if (
              !event.currentTarget.form
                ?.querySelector<HTMLInputElement>('input[type="email"]')
                ?.reportValidity()
            )
              return;

            pending.current = true;
            setBusy(true);

            try {
              const result = await authClient.emailOtp.sendVerificationOtp({
                email: email.trim(),
                type: "email-verification",
              });

              setMessage(
                result.error?.message ||
                  "If this account is eligible for code verification, check your email. If your provider uses links, use its verification message.",
              );
            } catch {
              setMessage("A verification code could not be requested. Please retry later.");
            } finally {
              pending.current = false;
              setBusy(false);
            }
          }}
        >
          Request verification code
        </button>
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        <Link href="/login" className="text-sm text-blue-700 underline">
          Sign in and finish setup
        </Link>
      </form>
    </main>
  );
}
