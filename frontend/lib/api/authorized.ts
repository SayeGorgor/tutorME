import { authClient } from "@/lib/auth/client";
import { apiFetch } from "./api-helper";
import { createAuthenticatedRequest } from "./authenticated-request";

export const authorized = createAuthenticatedRequest(async fresh => {
  if (!fresh) return authClient.token();
  // Bypass the SDK's browser cache on a missing/malformed token. This is the
  // existing same-origin Auth proxy, with its normal cookie/origin handling.
  const response = await fetch("/api/auth/token", { credentials: "same-origin", cache: "no-store" });
  return response.ok ? { data: await response.json() } : { error: true };
}, apiFetch);
