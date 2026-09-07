import { apiFetch } from "@/lib/api/api-helper";
import { Subject } from "@/lib/types";

/* LOCATION ACTIONS */
export const searchLocations = async (search: string): Promise<any[]> => {
  try {
    const response = await apiFetch<any[]>(`/api/locations/search?s=${encodeURIComponent(search)}`);
    return response;
  } catch (error) {
    console.error("Error searching locations:", error);
    return [];
  }
};

export const getTutorDistance = async (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): Promise<number> => {
  try {
    const response = await apiFetch<{ distance: number }>(
      `/api/tutors/distance?lat1=${lat1}&lon1=${lon1}&lat2=${lat2}&lon2=${lon2}`
    );
    return response.distance;
  } catch (error) {
    console.error("Error getting tutor distance:", error);
    return 0;
  }
};

/* SUBJECT ACTIONS */
export const getSubjects = async (): Promise<Subject[]> => {
  return apiFetch<Subject[]>("/api/subjects");
}