"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authPageClass, authFormClass } from "./auth-layout";
import { getRegistrationStatus, finishRegistration } from "@/lib/api/registration";
import { apiFetch } from "@/lib/api/api-helper";
import type { PolicyInfo } from "@/lib/policies";
import type { CompleteRegistrationInput, RegistrationStatus } from "@/lib/types";
import { completionPlan } from "@/lib/auth/completion-plan";

type Plan = ReturnType<typeof completionPlan>;
type PendingAccount = Extract<RegistrationStatus, { status: "needs_completion" }>;

export default function CompleteRegistration() {
  const router = useRouter();

  const [account, setAccount] = useState<PendingAccount | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [policies, setPolicies] = useState<PolicyInfo | null>(null);

  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);

  const [selectedRole, setSelectedRole] = useState<"student" | "tutor" | "">("");
  const [selectedPurpose, setSelectedPurpose] = useState<"self" | "guardian" | "">("");
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const submitting = useRef(false);

  const goToDashboard = (role: string) => {
    void fetch("/api/registration/context", { method: "DELETE" }).catch(() => {});
    router.replace(`/${role === "tutor" ? "tutor" : "student"}/dashboard`);
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [statusResult, policyResult, context] = await Promise.all([
          getRegistrationStatus(),
          apiFetch<PolicyInfo>("/api/policies"),
          fetch("/api/registration/context", { cache: "no-store" }).then(async (response) => {
            if (!response.ok)
              throw new Error("Your signup details could not load. Please sign in again or retry.");

            return response.json() as Promise<{ draft: CompleteRegistrationInput | null }>;
          }),
        ]);

        if (!active) return;
        if (!statusResult.data)
          throw new Error(
            statusResult.error?.message || "Your account could not load. Please retry.",
          );
        if (statusResult.data.status === "complete") {
          void fetch("/api/registration/context", { method: "DELETE" }).catch(() => {});
          router.replace(`/${statusResult.data.role === "tutor" ? "tutor" : "student"}/dashboard`);

          return;
        }
        if (statusResult.data.status !== "needs_completion")
          throw new Error(statusResult.data.message);
        if (!policyResult.data?.ready)
          throw new Error(
            policyResult.error?.message ||
              "Account setup is temporarily unavailable. Please retry later.",
          );

        const pending = statusResult.data;
        const next = completionPlan(pending.name, context.draft, policyResult.data.termsVersion);

        setAccount(pending);
        setPlan(next);
        setPolicies(policyResult.data);

        if (next.role && next.accountPurpose && next.acceptanceCurrent) {
          const result = await finishRegistration({
            firstName: next.firstName,
            lastName: next.lastName,
            role: next.role,
            accountPurpose: next.accountPurpose,
            timezone: next.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            adultConfirmed: true,
            termsAccepted: true,
            termsVersion: policyResult.data.termsVersion,
          });

          if (!active) return;
          if (result.error || !result.data)
            throw new Error(result.error?.message || "Setup could not be saved. Please retry.");

          void fetch("/api/registration/context", { method: "DELETE" }).catch(() => {});
          router.replace(`/${result.data.role === "tutor" ? "tutor" : "student"}/dashboard`);

          return;
        }
      } catch (error) {
        if (active)
          setMessage(
            error instanceof Error ? error.message : "Account setup could not load. Please retry.",
          );
      } finally {
        if (active) setBusy(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [reload, router]);

  const role = plan?.role || selectedRole;
  const purpose = plan?.accountPurpose || (role === "tutor" ? "tutor" : selectedPurpose);

  return (
    <main className={authPageClass}>
      <form
        className={authFormClass}
        onSubmit={async (event) => {
          event.preventDefault();

          if (busy || submitting.current || !account || !plan || !policies || !role || !purpose)
            return;
          if (!plan.acceptanceCurrent && (!adultConfirmed || !termsAccepted)) return;

          submitting.current = true;
          setBusy(true);
          setMessage("");

          try {
            const result = await finishRegistration({
              firstName: plan.firstName,
              lastName: plan.lastName,
              role,
              accountPurpose: purpose,
              timezone: plan.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
              adultConfirmed: true,
              termsAccepted: true,
              termsVersion: policies.termsVersion,
            });

            if (result.error || !result.data) {
              setMessage(result.error?.message || "Setup could not be saved. Please retry.");

              return;
            }

            goToDashboard(result.data.role);
          } catch {
            setMessage("Account setup could not be completed. Please retry.");
          } finally {
            submitting.current = false;
            setBusy(false);
          }
        }}
      >
        <h1 className="text-3xl font-bold tracking-tight">
          {busy ? "Setting up your account" : "Finish account setup"}
        </h1>
        {busy && <p role="status">Using your registered details. One moment?</p>}
        {account && (
          <dl className="rounded-xl bg-blue-50 p-4 text-sm">
            <dt className="text-slate-500">Registered name</dt>
            <dd className="mb-3 font-medium">{account.name}</dd>
            <dt className="text-slate-500">Verified email</dt>
            <dd className="break-all font-medium">{account.email}</dd>
            {plan?.role && (
              <>
                <dt className="mt-3 text-slate-500">Account type</dt>
                <dd className="font-medium">
                  {plan.role === "tutor" ? "Tutor" : "Student"}
                  {plan.accountPurpose === "guardian" ? " (parent or guardian)" : ""}
                </dd>
              </>
            )}
          </dl>
        )}
        {!busy && plan && (
          <>
            {!plan.role && (
              <label className="flex flex-col gap-2 text-sm">
                Account type
                <select
                  required
                  value={selectedRole}
                  onChange={(event) => {
                    setSelectedRole(event.target.value as typeof selectedRole);
                    setSelectedPurpose("");
                  }}
                >
                  <option value="" disabled>
                    Select your account type
                  </option>
                  <option value="student">Student</option>
                  <option value="tutor">Tutor</option>
                </select>
              </label>
            )}
            {!plan.accountPurpose && role === "student" && (
              <label className="flex flex-col gap-2 text-sm">
                Who is this account for?
                <select
                  required
                  value={selectedPurpose}
                  onChange={(event) =>
                    setSelectedPurpose(event.target.value as typeof selectedPurpose)
                  }
                >
                  <option value="" disabled>
                    Select an option
                  </option>
                  <option value="self">Myself (adult student)</option>
                  <option value="guardian">Parent or legal guardian</option>
                </select>
              </label>
            )}
            {!plan.acceptanceCurrent && (
              <div className="flex flex-col gap-3 text-sm leading-5">
                <p>
                  {plan.role
                    ? "Please review the current account requirements."
                    : "Your original signup details aren't available in this browser. Your registered name is kept; only the missing account choices are needed."}
                </p>
                <label className="grid grid-cols-[13px_minmax(0,1fr)] items-start gap-2">
                  <input
                    required
                    type="checkbox"
                    className="mt-[3.5px] size-[13px]"
                    checked={adultConfirmed}
                    onChange={(event) => setAdultConfirmed(event.target.checked)}
                  />
                  <span>I confirm that I am at least 18 and will manage this account myself.</span>
                </label>
                <label className="grid grid-cols-[13px_minmax(0,1fr)] items-start gap-2">
                  <input
                    required
                    type="checkbox"
                    className="mt-[3.5px] size-[13px]"
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                  />
                  <span>
                    I agree to the{" "}
                    <Link className="underline" href="/terms">
                      Terms of Use
                    </Link>
                    . Read the{" "}
                    <Link className="underline" href="/privacy">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
              </div>
            )}
            {purpose === "guardian" && (
              <p className="text-sm">
                Minor profiles and bookings for minors are not enabled. Do not submit child
                information.
              </p>
            )}
            <button
              type="submit"
              disabled={
                !role ||
                !purpose ||
                (!plan.acceptanceCurrent && (!adultConfirmed || !termsAccepted))
              }
              className="bg-blue-700 px-4 py-3 text-white"
            >
              Continue
            </button>
          </>
        )}
        {message && (
          <p role="alert" className="text-sm text-red-600">
            {message}
          </p>
        )}
        {!busy && message && (
          <button
            type="button"
            className="text-sm text-blue-700 underline"
            onClick={() => {
              setBusy(true);
              setMessage("");
              setAdultConfirmed(false);
              setTermsAccepted(false);
              setReload((value) => value + 1);
            }}
          >
            Reload account details
          </button>
        )}
        <Link href="/login" className="text-sm text-blue-700 underline">
          Return to sign in
        </Link>
        <Link href="/verify-email" className="text-sm text-blue-700 underline">
          Verify your email
        </Link>
      </form>
    </main>
  );
}
