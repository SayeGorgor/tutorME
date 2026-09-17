import { apiFetch } from "@/lib/api/api-helper";
import { Subject, TutorProfile, User, CreateUserSchema } from "@/lib/types";

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

/* USER ACTIONS */
export const createUser = async (user: CreateUserSchema): Promise<User | null> => {
  try {
    const response = await apiFetch<User>("/api/users", {
      method: "POST",
      body: { 
        auth_id: user.authID, 
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email, 
        role: user.role,
        timezone: user.timezone
      },
    });
    return response;
  } catch (error) {
    console.error("Error signing up:", error);
    return null;
  }
};

export const getTutors = async (): Promise<TutorProfile[]> => {
  return apiFetch<TutorProfile[]>("/api/tutors");
};

export const getTutorByUserId = async (id: number): Promise<TutorProfile> => {
  return apiFetch<TutorProfile>(`/api/tutors/user/${id}`);
};

/* SUBJECT ACTIONS */
export const getSubjects = async (): Promise<Subject[]> => {
  return apiFetch<Subject[]>("/api/subjects");
}