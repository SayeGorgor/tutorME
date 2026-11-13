"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/context/UserContext";
import { authorized } from "@/lib/api/authorized";
import { apiFetch } from "@/lib/api/api-helper";
import type { PolicyInfo } from "@/lib/policies";
import type { User } from "@/lib/types";

export default function AccountSettings() {
  const { user, loading } = useCurrentUser();

  const [policies, setPolicies] = useState<PolicyInfo | null>(null);
  const [adult, setAdult] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [purpose, setPurpose] = useState("self");

  const [deletion, setDeletion] = useState("Loading...");
  const [canSubmitDeletion, setCanSubmitDeletion] = useState(false);
  const [blocksBookings, setBlocksBookings] = useState(false);

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    apiFetch<PolicyInfo>("/api/policies").then((r) => setPolicies(r.data || null));

    authorized<{ status: string; canSubmit: boolean; blocksNewBookings: boolean }>(
      "/api/users/me/deletion-request",
    ).then((r) => {
      setDeletion(r.data?.status || "Unavailable");
      setCanSubmitDeletion(r.data?.canSubmit || false);
      setBlocksBookings(r.data?.blocksNewBookings || false);
    });
  }, []);

  if (loading) return <p className="p-6">Loading account...</p>;
  if (!user) return <p className="p-6">Sign in to manage your account.</p>;

  return (
    <main className="location-ui touch-controls mx-auto flex min-w-0 w-full [overflow-wrap:anywhere] max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-3xl font-semibold">Account and privacy</h1>
      <p>
        {user.firstName} {user.lastName} / {user.email}
      </p>
      <section className="surface rounded-2xl bg-white p-4 sm:p-6">
        <h2 className="mb-3 text-xl font-semibold">Adult eligibility and Terms</h2>
        <p className="mb-4 text-sm">
          Existing accounts keep their sessions. Before requesting or confirming appointments,
          explicitly confirm adult eligibility and current Terms. This is a self-attestation, not
          age or parental-identity verification.
        </p>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);

            const result = await authorized<User>("/api/users/eligibility", "POST", {
              adultConfirmed: adult,
              termsAccepted: accepted,
              termsVersion: policies?.termsVersion,
              accountPurpose: user.role === "tutor" ? "tutor" : purpose,
            });

            setMessage(
              result.error?.message || "Acknowledgment saved. Your current session remains valid.",
            );
            setBusy(false);
          }}
        >
          {user.role === "student" && (
            <label className="flex flex-col gap-2">
              Account purpose
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="border bg-white p-3"
              >
                <option value="self">Adult learning for myself</option>
                <option value="guardian">Parent/guardian (minor bookings disabled)</option>
              </select>
            </label>
          )}
          <label className="flex items-start gap-2">
            <input
              required
              type="checkbox"
              checked={adult}
              onChange={(e) => setAdult(e.target.checked)}
            />
            I am at least 18 and manage this account myself.
          </label>
          <label className="flex items-start gap-2">
            <input
              required
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="underline">
                Terms of Use
              </Link>{" "}
              and have access to the{" "}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          <button
            disabled={busy || !policies?.ready}
            className="self-start rounded-xl bg-blue-700 px-5 py-3 text-white"
          >
            Save acknowledgment
          </button>
          {!policies?.ready && (
            <p className="text-sm">
              Policies are awaiting operator approval. Acknowledgment and new bookings are paused.
            </p>
          )}
        </form>
      </section>
      <section className="surface flex flex-col gap-4 rounded-2xl bg-white p-4 sm:p-6">
        <h2 className="text-xl font-semibold">Request account deletion</h2>
        <p className="text-sm">
          Status: {deletion}.{" "}
          {blocksBookings
            ? "New requests and confirmations are paused while this account request is active or needs review."
            : "Closed requests do not pause new bookings."}{" "}
          A request is reviewed manually; it does not immediately delete your login, appointments or
          other people&apos;s records. Any necessary retention exceptions must be reviewed before
          processing.
        </p>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={confirmDelete}
            onChange={(e) => setConfirmDelete(e.target.checked)}
          />
          I want the operator to review deletion of my account and personal data.
        </label>
        <button
          disabled={busy || !confirmDelete || !canSubmitDeletion}
          className="self-start rounded-xl border border-red-300 px-5 py-3 text-red-700"
          onClick={async () => {
            setBusy(true);

            const result = await authorized<{
              status: string;
              canSubmit: boolean;
              blocksNewBookings: boolean;
            }>("/api/users/me/deletion-request", "POST");

            if (result.data) {
              setDeletion(result.data.status);
              setCanSubmitDeletion(result.data.canSubmit);
              setBlocksBookings(result.data.blocksNewBookings);
            }

            setMessage(result.error?.message || "Deletion request recorded for manual review.");
            setBusy(false);
          }}
        >
          Submit deletion request
        </button>
        {!canSubmitDeletion && (
          <p className="text-sm">
            Your existing request record is preserved. Contact the privacy operator for a new review
            or questions about its status.
          </p>
        )}
        {policies?.contactEmail && (
          <a className="text-sm underline" href={`mailto:${policies.contactEmail}`}>
            Contact the privacy operator
          </a>
        )}
      </section>
      {message && <p role="status">{message}</p>}
      <Link
        href={user.role === "tutor" ? "/tutor/dashboard" : "/student/dashboard"}
        className="underline"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
