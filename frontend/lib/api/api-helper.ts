import type { APIResponse } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function apiFetch<T>(
  endpoint: string,
  options?: ApiFetchOptions,
): Promise<APIResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      let message = `Something went wrong`;
      let code: string | undefined;

      try {
        const errorData = await response.json();

        if (typeof errorData.detail === "string") {
          message = errorData.detail;
        } else if (
          errorData.detail &&
          typeof errorData.detail === "object" &&
          !Array.isArray(errorData.detail)
        ) {
          if (typeof errorData.detail.message === "string") message = errorData.detail.message;
          if (typeof errorData.detail.code === "string") code = errorData.detail.code;
        } else if (Array.isArray(errorData.detail)) {
          message = errorData.detail
            .map((item: { msg?: string }) => item.msg || "Invalid input")
            .join("; ");
        }
      } catch {
        // Ignore JSON parsing errors and use the default message
      }

      return { error: { status: response.status, message, code } };
    }

    const data = (await response.json()) as T;

    return { data };
  } catch {
    return {
      error: {
        status: 500,
        message: "The server could not be reached. Check your connection and retry.",
      },
    };
  }
}
