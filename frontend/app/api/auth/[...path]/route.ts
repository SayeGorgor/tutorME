import { auth } from "@/lib/auth/server";
import { createSignupHandler } from "@/lib/auth/signup-handler";
import { retainSignupDraft } from "@/lib/auth/registration-draft";
const handlers = auth.handler();
export const GET = handlers.GET;
export const POST = createSignupHandler(handlers.POST, body =>
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/policies/registration-check`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: body.email, adultConfirmed: body.adultConfirmed, termsAccepted: body.termsAccepted,
          termsVersion: body.termsVersion, accountPurpose: body.accountPurpose }),
        cache: "no-store", signal: AbortSignal.timeout(5000),
  }),
  (body, response, request) => retainSignupDraft(body, response, process.env.NEON_AUTH_COOKIE_SECRET || "", new URL(request.url).protocol === "https:")
);
