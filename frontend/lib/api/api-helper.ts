const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch<T>(
    endpoint: string, 
    options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, options);
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}