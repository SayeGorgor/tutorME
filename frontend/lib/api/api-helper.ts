const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
    endpoint: string, 
    options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, options);

  if (!response.ok) {
    let message = `Something went wrong`;

    try {
      const errorData = await response.json();
      if(errorData.detail) { message = errorData.detail;}
    } catch (error) {
      // Ignore JSON parsing errors and use the default message
    }

    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}