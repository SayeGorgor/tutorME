"use client";

import { useEffect, useState, useRef } from "react";
import { authPageClass, authFormClass } from "@/components/auth-layout";

import Image from "next/image";
import Link from "next/link";

import { apiFetch } from "@/lib/api/api-helper";
import { type PolicyInfo } from "@/lib/policies";
import { authClient } from "@/lib/auth/client";
import { getRegistrationStatus, finishRegistration } from "@/lib/api/registration";
import type { RegistrationStatus } from "@/lib/types";
import { createAuthAttempt } from "@/lib/auth/form-attempt";
import { useRouter } from "next/navigation";

export default function SignupForm({
  role,
  completion = false,
}: {
  role: "student" | "tutor";
  completion?: boolean;
}) {
  const router = useRouter();

  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const [attemptAuth] = useState(createAuthAttempt);

  const submitting = useRef(false);

  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [requirementsVersion, setRequirementsVersion] = useState(0);
  const [checkingRequirements, setCheckingRequirements] = useState(true);

  const isTutor = role === "tutor";
  const accountLabel = isTutor ? "Tutor" : "Student";

  const [policies, setPolicies] = useState<PolicyInfo | null>(null);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [purpose, setPurpose] = useState<"self" | "guardian">("self");

  useEffect(() => {
    let active = true;

    Promise.all([
      apiFetch<PolicyInfo>("/api/policies"),
      completion ? getRegistrationStatus() : Promise.resolve(null),
    ])
      .then(([policyResult, accountResult]) => {
        if (!active) return;

        setPolicies(policyResult.data || null);
        setStatus(accountResult?.data || null);
        setStatusError(accountResult?.error?.message || policyResult.error?.message || "");
        setCheckingRequirements(false);

        if (accountResult?.data?.status === "complete")
          router.replace(`/${accountResult.data.role === "tutor" ? "tutor" : "student"}/dashboard`);
      })
      .catch(() => {
        if (!active) return;

        setStatusError("Account requirements could not load. Please check again.");
        setCheckingRequirements(false);
      });

    return () => {
      active = false;
    };
  }, [completion, router, requirementsVersion]);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [systemMessage, setSystemMessage] = useState("");

  const hasCreatedIdentity = createdEmail !== null && createdEmail === email.trim().toLowerCase();

  const retryRequirements = () => {
    setCheckingRequirements(true);
    setStatusError("");
    setTermsAccepted(false);
    setRequirementsVersion((version) => version + 1);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting.current || checkingRequirements) return;
    if (!policies?.ready || !adultConfirmed || !termsAccepted) {
      setHasError(true);
      setSystemMessage(
        "Registration requires published policies, adult eligibility and Terms acceptance.",
      );

      return;
    }

    if (!completion && !hasCreatedIdentity && password !== confirmPassword) {
      setHasError(true);
      setSystemMessage("Passwords do not match");

      return;
    }

    submitting.current = true;
    setLoading(true);
    setSystemMessage("");
    setHasError(false);

    try {
      const accountPurpose = isTutor ? ("tutor" as const) : purpose;

      if (!completion && !hasCreatedIdentity) {
        const signupData = {
          email,
          password,
          name: `${firstName.trim()} ${lastName.trim()}`,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          accountType: role,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          adultConfirmed,
          termsAccepted,
          termsVersion: policies.termsVersion,
          accountPurpose,
        };
        const attempt = await attemptAuth(() => authClient.signUp.email(signupData), "signup");

        if (attempt.kind === "busy") return;
        if (attempt.kind === "error" || !attempt.data.user) {
          setHasError(true);
          setSystemMessage(
            attempt.kind === "error"
              ? attempt.message
              : "Signup could not be confirmed. Please try again or sign in if you already registered.",
          );

          return;
        }

        setCreatedEmail(email.trim().toLowerCase());

        if (attempt.data.user.emailVerified !== true) {
          // Keep the email out of the URL and never retain the password.
          try {
            sessionStorage.setItem("tutorme:verification-email", email.trim().toLowerCase());
          } catch {
            /* Prefill is optional. */
          }

          router.replace("/verify-email");

          return;
        }
      }

      const check = await getRegistrationStatus();

      if (check.data?.status === "complete") {
        router.replace(`/${check.data.role === "tutor" ? "tutor" : "student"}/dashboard`);

        return;
      }
      if (!check.data || check.data.status !== "needs_completion") {
        setHasError(!!check.error || check.data?.status === "PROVIDER_EMAIL_UNAVAILABLE");
        setStatus(check.data || null);
        setSystemMessage(
          check.data && "message" in check.data
            ? check.data.message
            : "Your sign-in account may already exist. Verify your email, then sign in and finish account setup. Do not register again.",
        );

        return;
      }

      const result = await finishRegistration({
        firstName,
        lastName,
        role,
        adultConfirmed,
        termsAccepted,
        termsVersion: policies.termsVersion,
        accountPurpose,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (result.error || !result.data) {
        setHasError(true);
        setSystemMessage(
          `${result.error?.message || "Account setup could not be saved."} You can safely retry Finish account setup after signing in.`,
        );

        return;
      }

      router.replace(`/${result.data.role === "tutor" ? "tutor" : "student"}/dashboard`);
    } catch {
      setHasError(true);
      setSystemMessage(
        "Account setup could not be completed. Please try again, or sign in to finish setup if you already registered.",
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <main className={authPageClass}>
      <form
        className={authFormClass}
        onSubmit={handleSignUp}
        onChange={() => {
          if (hasError) {
            setHasError(false);
            setSystemMessage("");
          }
        }}
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {completion ? "Finish account setup" : `${accountLabel} Sign Up`}
          </h1>
          <p className="text-gray-600">
            {isTutor
              ? "Create your tutor account to share your expertise and set your availability."
              : "Create your student account to find tutors and start learning."}
          </p>
        </div>

        {loading ? (
          <Image
            src="/icons/loading_animation_icon.svg"
            alt="Loading Animation"
            width={28}
            height={28}
            className="self-center inline-block"
          />
        ) : (
          systemMessage && (
            <p
              role={hasError ? "alert" : "status"}
              className={`self-center text-lg ${hasError ? "text-red-500" : "text-green-500"}`}
            >
              {systemMessage}
            </p>
          )
        )}

        <div className="flex gap-4 flex-col xl:flex-row">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-gray-600">
              First Name<span className="text-red-500">*</span>
            </span>
            <input
              required
              autoComplete="given-name"
              type="text"
              className="border border-gray-300 rounded-md p-2"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-gray-600">
              Last Name<span className="text-red-500">*</span>
            </span>
            <input
              required
              autoComplete="family-name"
              type="text"
              className="border border-gray-300 rounded-md p-2"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
        </div>

        {!completion && (
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">
              Email<span className="text-red-500">*</span>
            </span>
            <input
              required
              autoComplete="email"
              type="email"
              className="border border-gray-300 rounded-md p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        )}

        {!completion && !hasCreatedIdentity && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-gray-600">
                Password<span className="text-red-500">*</span>
              </span>
              <div className="relative">
                <input
                  required
                  autoComplete="new-password"
                  type={showPassword ? "text" : "password"}
                  className="border border-gray-300 rounded-md p-2 w-full"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 flex w-11 -translate-y-1/2 items-center justify-center"
                >
                  <Image
                    src={
                      showPassword
                        ? "/icons/hide_password_icon.svg"
                        : "/icons/show_password_icon.svg"
                    }
                    alt={showPassword ? "Hide password" : "Show password"}
                    width={25}
                    height={25}
                    className="cursor-pointer"
                  />
                </button>
              </div>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-gray-600">
                Confirm Password<span className="text-red-500">*</span>
              </span>
              <div className="relative">
                <input
                  required
                  autoComplete="new-password"
                  type={showPasswordConfirm ? "text" : "password"}
                  className="border border-gray-300 rounded-md p-2 w-full"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-1 top-1/2 flex w-11 -translate-y-1/2 items-center justify-center"
                >
                  <Image
                    src={
                      showPasswordConfirm
                        ? "/icons/hide_password_icon.svg"
                        : "/icons/show_password_icon.svg"
                    }
                    alt={showPasswordConfirm ? "Hide password" : "Show password"}
                    width={25}
                    height={25}
                    className="cursor-pointer"
                  />
                </button>
              </div>
            </label>
          </>
        )}
        <div className="flex flex-col gap-3 text-sm leading-5">
          {!isTutor && (
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 font-medium">Who are you registering for?</legend>
              <label className="grid grid-cols-[13px_minmax(0,1fr)] items-start gap-2">
                <input
                  type="radio"
                  className="mt-[3.5px] size-[13px]"
                  name="purpose"
                  checked={purpose === "self"}
                  onChange={() => setPurpose("self")}
                />
                <span>Myself (adult student)</span>
              </label>
              <label className="grid grid-cols-[13px_minmax(0,1fr)] items-start gap-2">
                <input
                  type="radio"
                  className="mt-[3.5px] size-[13px]"
                  name="purpose"
                  checked={purpose === "guardian"}
                  onChange={() => setPurpose("guardian")}
                />
                <span>Parent or legal guardian</span>
              </label>
              {purpose === "guardian" && (
                <p>
                  Minor profiles and bookings for minors are not enabled yet. Do not submit child
                  information.
                </p>
              )}
            </fieldset>
          )}
          <label className="grid grid-cols-[13px_minmax(0,1fr)] items-start gap-2">
            <input
              required
              type="checkbox"
              className="mt-[3.5px] size-[13px]"
              checked={adultConfirmed}
              onChange={(e) => setAdultConfirmed(e.target.checked)}
            />
            <span>I confirm that I am at least 18 and will manage this account myself.</span>
          </label>
          <label className="grid grid-cols-[13px_minmax(0,1fr)] items-start gap-2">
            <input
              required
              type="checkbox"
              className="mt-[3.5px] size-[13px]"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="underline">
                Terms of Use
              </Link>
              . Read the{" "}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>{" "}
              for information about data practices.
            </span>
          </label>
        </div>
        {!policies?.ready && (
          <p role="status" className="text-sm text-amber-800">
            {checkingRequirements
              ? "Checking registration requirements..."
              : statusError ||
                "Registration is paused until approved policies and verified operator contact information are published."}
          </p>
        )}
        {(!policies?.ready ||
          statusError ||
          hasError ||
          (completion && status?.status !== "needs_completion")) && (
          <button
            type="button"
            disabled={checkingRequirements || loading}
            onClick={retryRequirements}
            className="text-sm text-blue-700 underline"
          >
            {checkingRequirements
              ? "Checking account requirements..."
              : "Check account requirements again"}
          </button>
        )}
        <button
          type="submit"
          disabled={
            loading ||
            checkingRequirements ||
            !policies?.ready ||
            !adultConfirmed ||
            !termsAccepted ||
            (completion && status?.status !== "needs_completion")
          }
          className="bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 cursor-pointer"
        >
          {loading
            ? "Saving..."
            : completion || hasCreatedIdentity
              ? "Finish account setup"
              : `Create ${accountLabel} Account`}
        </button>
        {completion && (
          <div className="rounded-xl bg-blue-50 p-3 text-sm">
            {status?.status === "needs_completion" ? (
              <p>
                Verified sign-in email: {status.email}. Your identity and email come from your
                authenticated session.
              </p>
            ) : (
              <p role="status">
                {status && "message" in status
                  ? status.message
                  : statusError || "Checking your signed-in account..."}
              </p>
            )}
          </div>
        )}
        <p className="text-sm">
          <Link href="/complete-registration" className="text-blue-700 underline">
            Already created a sign-in? Finish account setup
          </Link>
        </p>
        <p className="text-sm">
          <Link href="/verify-email" className="text-blue-700 underline">
            Verify your email
          </Link>
          . Then{" "}
          <Link href="/login" className="text-blue-700 underline">
            sign in again
          </Link>{" "}
          to refresh verification.
        </p>
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-600 underline">
            Log in
          </Link>
        </p>
        <p className="text-sm text-gray-600">
          {isTutor ? "Looking for a tutor? " : "Want to teach? "}
          <Link href={isTutor ? "/signup" : "/signup/tutor"} className="text-indigo-600 underline">
            {isTutor ? "Sign up as a student" : "Sign up as a tutor"}
          </Link>
        </p>
      </form>
    </main>
  );
}
