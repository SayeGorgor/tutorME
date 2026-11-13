"use client";

import { useState, useRef } from "react";
import { authPageClass, authFormClass } from "@/components/auth-layout";

import { useRouter } from "next/navigation";
import Image from "next/image";

import { authClient } from "@/lib/auth/client";
import { getRegistrationStatus } from "@/lib/api/registration";
import Link from "next/link";
import { createAuthAttempt } from "@/lib/auth/form-attempt";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [attemptAuth] = useState(createAuthAttempt);

  const submitting = useRef(false);

  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [systemMessage, setSystemMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting.current) return;

    submitting.current = true;
    setLoading(true);
    setSystemMessage("");
    setHasError(false);

    try {
      if (!signedIn) {
        const attempt = await attemptAuth(
          () => authClient.signIn.email({ email: email.trim(), password }),
          "login",
        );

        if (attempt.kind === "busy") return;
        if (attempt.kind === "error") {
          setHasError(true);
          setSystemMessage(attempt.message);

          return;
        }

        setSignedIn(true);
      }

      const { data, error } = await getRegistrationStatus();

      if (data?.status === "complete") {
        router.replace(`/${data.role === "tutor" ? "tutor" : "student"}/dashboard`);
      } else if (data) {
        router.replace("/complete-registration");
      } else {
        if (error?.status === 401) setSignedIn(false);

        setHasError(true);
        setSystemMessage(
          error?.status === 401
            ? "Please sign in again to continue."
            : "You're signed in, but account details could not load. Select Continue to try again.",
        );
      }
    } catch {
      setHasError(true);
      setSystemMessage("Sign-in could not be completed. Please try again.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <main className={authPageClass}>
      <form
        onSubmit={handleLogin}
        className={authFormClass}
        onChange={() => {
          setSignedIn(false);

          if (hasError) {
            setHasError(false);
            setSystemMessage("");
          }
        }}
      >
        <h1 className="text-3xl font-bold tracking-tight">Log In</h1>

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

        <label className="flex flex-col gap-1">
          <span className="text-gray-600">Email</span>
          <input
            required
            disabled={loading}
            autoComplete="email"
            type="email"
            className="border border-gray-300 rounded-md p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-gray-600">Password</span>
          <div className="relative">
            <input
              required
              disabled={loading}
              autoComplete="current-password"
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
                  showPassword ? "/icons/hide_password_icon.svg" : "/icons/show_password_icon.svg"
                }
                alt={showPassword ? "Hide password" : "Show password"}
                width={25}
                height={25}
                className="cursor-pointer"
              />
            </button>
          </div>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600"
        >
          {loading ? "Signing in..." : signedIn ? "Continue" : "Log In"}
        </button>
        <p className="text-sm">
          <Link href="/complete-registration" className="text-blue-700 underline">
            Finish an existing account setup
          </Link>
        </p>
        <p className="text-sm">
          <Link href="/verify-email" className="text-blue-700 underline">
            Verify your email before signing in
          </Link>
        </p>
      </form>
    </main>
  );
}
