import { auth } from "@/lib/auth/server";
import { DRAFT_COOKIE, openDraft, draftForIdentity } from "@/lib/auth/registration-draft";
import { cookies } from "next/headers";

export async function GET() {
  const { data } = await auth.getSession();
  if (!data?.user || !data.session) return Response.json({ message: "Please sign in again." }, { status: 401 });
  const value = (await cookies()).get(DRAFT_COOKIE)?.value;
  const draft = value ? openDraft(value, process.env.NEON_AUTH_COOKIE_SECRET || "") : null;
  const matched = draftForIdentity(draft, data.user);
  return Response.json({ draft: matched && {
    firstName: matched.firstName, lastName: matched.lastName, role: matched.role,
    accountPurpose: matched.accountPurpose, timezone: matched.timezone,
    adultConfirmed: matched.adultConfirmed, termsAccepted: matched.termsAccepted, termsVersion: matched.termsVersion,
  } }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE() {
  // Cleanup affects only this browser's draft, never the provider or app account.
  (await cookies()).delete(DRAFT_COOKIE);
  return Response.json({ cleared: true });
}
