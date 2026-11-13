// Server-only usage: authenticated encryption, with a separate derived key from
// the existing server cookie secret. Never save a password or provider token.
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

export const DRAFT_COOKIE = "tutorme.registration";
const LIFETIME = 7 * 24 * 60 * 60;

type SignupRole = "student" | "tutor";
export type RegistrationDraft = {
  subject: string;
  email: string;
  firstName: string;
  lastName: string;
  role: SignupRole;
  accountPurpose: "self" | "guardian" | "tutor";
  timezone: string;
  adultConfirmed: true;
  termsAccepted: true;
  termsVersion: string;
  acceptedAt: number;
};

function key(secret: string) {
  if (secret.length < 32) throw new Error("A valid server cookie secret is required");

  return Buffer.from(hkdfSync("sha256", secret, "tutorme", "registration-draft-v1", 32));
}

export function signupDraft(
  body: Record<string, unknown>,
  user: Record<string, unknown>,
  now = Date.now(),
): RegistrationDraft | null {
  const { firstName, lastName, accountType: role, accountPurpose, timezone, termsVersion } = body;

  if (
    typeof firstName !== "string" ||
    !firstName.trim() ||
    firstName.length > 255 ||
    typeof lastName !== "string" ||
    !lastName.trim() ||
    lastName.length > 255 ||
    (role !== "student" && role !== "tutor") ||
    !["self", "guardian", "tutor"].includes(String(accountPurpose)) ||
    (role === "tutor") !== (accountPurpose === "tutor") ||
    typeof timezone !== "string" ||
    typeof termsVersion !== "string" ||
    body.adultConfirmed !== true ||
    body.termsAccepted !== true ||
    typeof user.id !== "string" ||
    typeof user.email !== "string" ||
    typeof body.email !== "string" ||
    user.email.toLowerCase() !== body.email.trim().toLowerCase() ||
    user.name !== `${firstName.trim()} ${lastName.trim()}`
  )
    return null;

  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
  } catch {
    return null;
  }

  return {
    subject: user.id,
    email: user.email.toLowerCase(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    role,
    accountPurpose: accountPurpose as RegistrationDraft["accountPurpose"],
    timezone,
    adultConfirmed: true,
    termsAccepted: true,
    termsVersion,
    acceptedAt: now,
  };
}

export function sealDraft(draft: RegistrationDraft, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(draft), "utf8"), cipher.final()]);

  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function openDraft(
  value: string,
  secret: string,
  now = Date.now(),
): RegistrationDraft | null {
  try {
    if (value.length > 4000) return null;

    const bytes = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(secret), bytes.subarray(0, 12));

    decipher.setAuthTag(bytes.subarray(12, 28));

    const draft = JSON.parse(
      Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"),
    );

    if (
      typeof draft.acceptedAt !== "number" ||
      draft.acceptedAt > now ||
      now - draft.acceptedAt > LIFETIME * 1000
    )
      return null;

    // Revalidate fields even though the payload is authenticated.
    return signupDraft(
      { ...draft, accountType: draft.role },
      { id: draft.subject, email: draft.email, name: `${draft.firstName} ${draft.lastName}` },
      draft.acceptedAt,
    );
  } catch {
    return null;
  }
}

export function draftForIdentity(
  draft: RegistrationDraft | null,
  identity: { id: string; email: string; name?: string | null },
) {
  return draft &&
    draft.subject === identity.id &&
    draft.email === identity.email.toLowerCase() &&
    `${draft.firstName} ${draft.lastName}` === identity.name
    ? draft
    : null;
}

export async function retainSignupDraft(
  body: Record<string, unknown>,
  response: Response,
  secret: string,
  secure: boolean,
) {
  try {
    const result = await response.clone().json();
    const draft = result.user && signupDraft(body, result.user);

    if (!draft) return response;

    const cookie = `${DRAFT_COOKIE}=${sealDraft(draft, secret)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${LIFETIME}${secure ? "; Secure" : ""}`;
    const output = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    output.headers.append("Set-Cookie", cookie);

    return output;
  } catch {
    // Provider signup has already committed; don't turn a cookie failure into a
    // misleading signup error. Verified-name recovery remains available.
    return response;
  }
}
