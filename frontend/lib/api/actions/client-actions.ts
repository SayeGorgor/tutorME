import { apiFetch } from "@/lib/api/api-helper";

export const searchLocations = async (search: string): Promise<any[]> => {
  try {
    const response = await apiFetch<any[]>(`/api/locations/search?s=${encodeURIComponent(search)}`);
    return response;
  } catch (error) {
    console.error("Error searching locations:", error);
    return [];
  }
};