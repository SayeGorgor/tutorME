import type { APIResponse } from "../types";

type TokenResult = { data?: { token?: unknown } | null; error?: unknown };
type RequestApi = <T>(path: string, options: { method: string; body?: unknown; headers: Record<string, string> }) => Promise<APIResponse<T>>;
const jwtShape = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);

export function createAuthenticatedRequest(getToken: (fresh: boolean) => Promise<TokenResult>, request: RequestApi) {
  let pendingToken: Promise<string | null> | null = null;
  const token = () => {
    if (!pendingToken) pendingToken = (async () => {
      for (const fresh of [false, true]) {
        try {
          const result = await getToken(fresh);
          if (!result.error && jwtShape(result.data?.token)) return result.data.token;
        } catch { /* Retry token retrieval once; never print provider tokens/errors. */ }
      }
      return null;
    })().finally(() => { pendingToken = null; });
    return pendingToken;
  };
  return async function authorized<T>(path: string, method = "GET", body?: unknown): Promise<APIResponse<T>> {
    const jwt = await token();
    if (!jwt) return { error: { status: 401, code: "AUTH_TOKEN_UNAVAILABLE", message: "Your session could not be verified. Please sign in again." } };
    // Shape checking prevents malformed headers; only the backend verifies JWTs.
    return request<T>(path, { method, body, headers: { Authorization: `Bearer ${jwt}` } });
  };
}
