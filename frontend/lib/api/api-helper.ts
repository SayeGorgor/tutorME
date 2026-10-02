import type { APIResponse } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export async function apiFetch<T>(
    endpoint: string, 
    options?: ApiFetchOptions
): Promise<APIResponse<T>> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = `Something went wrong`;

    try {
      const errorData = await response.json();
      if(errorData.detail) { message = errorData.detail;}
    } catch (error) {
      // Ignore JSON parsing errors and use the default message
    }

    return { error: { status: response.status, message } };
  }

  const data = await response.json() as T;

  return { data };
}