type AuthResult<T> = { data?: T | null; error?: unknown };

function errorMessage(error: unknown, context: "signup" | "login") {
  const raw = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const detail = raw.body && typeof raw.body === "object" ? raw.body as Record<string, unknown> : raw;
  const code = String(detail.code || raw.code || "");
  const status = Number(raw.status || detail.status || 0);
  if (status === 409 || code.startsWith("USER_ALREADY_EXISTS") || code === "ACCOUNT_ALREADY_EXISTS") {
    return "An account with this email already exists. Please sign in to continue.";
  }
  if (code === "EMAIL_NOT_VERIFIED" || code === "EMAIL_VERIFICATION_REQUIRED") {
    return "Please verify your email, then sign in again to continue.";
  }
  if (context === "login" && (status === 401 || code === "INVALID_EMAIL_OR_PASSWORD" || code === "INVALID_PASSWORD")) {
    return "The email or password is incorrect. Please check them and try again.";
  }
  if (status >= 400 && status < 500 && typeof detail.message === "string") return detail.message;
  return context === "login"
    ? "Sign-in could not be completed. Please try again."
    : "Signup could not be completed. Please try again, or sign in if you already registered.";
}

// Each form owns a runner. The lock lasts only for the pending request and is
// always released for returned errors, thrown errors and successful responses.
export function createAuthAttempt() {
  let pending = false;
  return async function attempt<T>(action: () => Promise<AuthResult<T>>, context: "signup" | "login") {
    if (pending) return { kind: "busy" as const };
    pending = true;
    try {
      const result = await action();
      if (result.error || !result.data) return { kind: "error" as const, message: errorMessage(result.error, context) };
      return { kind: "success" as const, data: result.data };
    } catch (error) {
      return { kind: "error" as const, message: errorMessage(error, context) };
    } finally {
      pending = false;
    }
  };
}
