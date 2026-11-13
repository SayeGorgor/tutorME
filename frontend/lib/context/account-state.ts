import type { APIResponse, User } from "../types";

export type AccountState =
  | { status: "loading"; user: null }
  | { status: "ready"; user: User }
  | { status: "error" | "registration-incomplete" | "unauthenticated"; user: null; message: string };

export const initialAccountState: AccountState = { status: "loading", user: null };

function validUser(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<User>;
  const text = (field: unknown) => typeof field === "string" && field.trim().length > 0;
  return Number.isSafeInteger(user.id) && Number(user.id) > 0
    // Registration supports single-name accounts with an empty lastName.
    && text(user.firstName) && typeof user.lastName === "string" && text(user.email) && text(user.timezone)
    && (user.role === "student" || user.role === "tutor" || user.role === "admin");
}

export async function loadAccount(request: () => Promise<APIResponse<User>>): Promise<AccountState> {
  try {
    const result = await request();
    if (result.error?.code === "REGISTRATION_INCOMPLETE") {
      return { status: "registration-incomplete", user: null, message: "Finish setting up your account to continue." };
    }
    // Token acquisition can fail during a transport outage. Only a backend 401
    // establishes that the presented credentials were rejected.
    if (result.error?.status === 401 && result.error.code !== "AUTH_TOKEN_UNAVAILABLE") {
      return { status: "unauthenticated", user: null, message: "Your session has expired or could not be verified. Please sign in again." };
    }
    if (!result.error && validUser(result.data)) return { status: "ready", user: result.data };
  } catch {
    // Never show provider diagnostics or turn a thrown request into a null success.
  }
  return { status: "error", user: null, message: "Your account details could not load. Please retry." };
}
