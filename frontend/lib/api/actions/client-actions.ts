import { apiFetch } from "@/lib/api/api-helper";
import { authorized } from "@/lib/api/authorized";

import { 
  Subject, 
  TutorProfile, 
  UpdateTutorProfileSchema,
  User, 
  CreateUserSchema, 
  Availability,
  APIResponse,
  UpdateTutorAvailabilitySchema
} from "@/lib/types";

/* LOCATION ACTIONS */
// export const searchLocations = async (search: string): Promise<any[]> => {
//   try {
//     const response = await apiFetch<any[]>(`/api/locations/search?s=${encodeURIComponent(search)}`);
//     return response;
//   } catch (error) {
//     console.error("Error searching locations:", error);
//     return [];
//   }
// };

// export const getTutorDistance = async (
//   lat1: number,
//   lon1: number,
//   lat2: number,
//   lon2: number
// ): Promise<number> => {
//   try {
//     const response = await apiFetch<{ distance: number }>(
//       `/api/tutors/distance?lat1=${lat1}&lon1=${lon1}&lat2=${lat2}&lon2=${lon2}`
//     );
//     return response.distance;
//   } catch (error) {
//     console.error("Error getting tutor distance:", error);
//     return 0;
//   }
// };

/* USER ACTIONS */
export const createUser = (user: CreateUserSchema): Promise<APIResponse<User>> => authorized<User>("/api/users/", "POST", {
  adultConfirmed: user.adultConfirmed, termsAccepted: user.termsAccepted,
  termsVersion: user.termsVersion, accountPurpose: user.accountPurpose,
  auth_id: user.authID, first_name: user.firstName, last_name: user.lastName,
  email: user.email, role: user.role, timezone: user.timezone,
});

export const getCurrentUser = (): Promise<APIResponse<User>> => authorized<User>("/api/users/me");

export const updateTutorProfile = ({ userId, tutorProfileData }: UpdateTutorProfileSchema): Promise<APIResponse<TutorProfile>> =>
  authorized<TutorProfile>(`/api/tutors/user/${userId}`, "PATCH", tutorProfileData);

export const updateTutorAvailability = async ({ tutorID, availabilityData }: UpdateTutorAvailabilitySchema): Promise<APIResponse<Availability[]>> => {
  const result = await authorized<{ availability: Availability[] }>(`/api/tutors/${tutorID}/availability`, "PUT", availabilityData);
  return result.error ? { error: result.error } : { data: result.data?.availability };
};

export const getTutors = async (): Promise<APIResponse<TutorProfile[]>> => {
  const { data: response, error } = await apiFetch<TutorProfile[]>("/api/tutors");
  if (error) {
    return { error };
  }
  return { data: response };
};

export const getTutorByUserId = async (id: number): Promise<APIResponse<TutorProfile>> => {
  const { data: response, error } = await apiFetch<TutorProfile>(`/api/tutors/user/${id}`);
  if (error) {
    return { error };
  }
  return { data: response };
};

/* SUBJECT ACTIONS */
export const getSubjects = async (): Promise<APIResponse<Subject[]>> => {
  const { data: response, error } = await apiFetch<Subject[]>("/api/subjects");
  if (error) {
    return { error };
  }
  return { data: response };
}

/* NON ASYNC HELPERS */
export const formatToDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

export const getAvailabilityCalendarCellSize = (isActive: boolean, hasLeftNeighbor: boolean, hasRightNeighbor: boolean) => {
  if(!isActive) return "rounded-2xl border border-black"
  
  return `
    bg-blue-500
    ${hasLeftNeighbor ? "-ml-2 pl-2 rounded-l-none border-l-0" : "rounded-l-2xl"}
    ${hasRightNeighbor ? "-mr-2 pr-2 rounded-r-none border-r-0" : "rounded-r-2xl"}
    border border-black
  `
}

export const getAvailabilityWeekDates = (selectedDate: string) => {
  const [year, month, day] = selectedDate
    .split("T")[0]
    .split("-")
    .map(Number);

  const date = new Date(year, month - 1, day);
  const startOfWeek = new Date(date);

  startOfWeek.setDate(date.getDate() - date.getDay());

  return Array.from({ length: 7 }, (_, i) => {
    const currentDate = new Date(startOfWeek);
    currentDate.setDate(startOfWeek.getDate() + i);

    return currentDate;
  });
};