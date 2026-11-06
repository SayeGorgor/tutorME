import { authClient } from "@/lib/auth/client";
import { apiFetch } from "./api-helper";
import type { APIResponse } from "@/lib/types";
export async function authorized<T>(path: string, method = "GET", body?: unknown): Promise<APIResponse<T>> {
  try {
    const { data } = await authClient.token();
    if (!data?.token) return { error: { status: 401, message: "Please sign in again." } };
    return apiFetch<T>(path, { method, body, headers: { Authorization: `Bearer ${data.token}` } });
  } catch { return { error: { status: 500, message: "The request could not be completed." } }; }
}
