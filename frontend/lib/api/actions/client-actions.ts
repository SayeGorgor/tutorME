import { apiFetch } from "@/lib/api/api-helper";
import { authClient } from "@/lib/auth/client";

import { 
  Subject, 
  TutorProfile, 
  UpdateTutorProfileSchema,
  User, 
  CreateUserSchema, 
  Availability,
  APIError,
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
export const createUser = async (user: CreateUserSchema): Promise<APIResponse<User>> => {
  try {
    const { data: response, error: resError } = await apiFetch<User>("/api/users", {
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
    if (resError) {
      return { error: resError };
    }
    return { data: response };
  } catch (error) {
    console.error("Error signing up:", error);
    return { error: { 
      status: (error as any)?.status || 500,
      message: (error as Error).message || "Error signing up" 
    } };
  }
};

export const getCurrentUser = async (): Promise<APIResponse<User>> => {
  try {
    const { data: tokenData } = await authClient.token();
    
    const { data: response, error: resError } = await apiFetch<User>('/api/users/me', {
        headers: {
            Authorization: `Bearer ${tokenData?.token}`
        }
    });
    if (resError) {
      return { error: resError };
    }
    return { data: response };
  } catch (error) {
    console.error("Error getting current user:", error);
    return { error: { 
      status: (error as any)?.status || 500,
      message: (error as Error).message || "Error getting current user" 
    } };
  }
};

export const updateTutorProfile = async (inputData: UpdateTutorProfileSchema): Promise<APIResponse<TutorProfile>> => {
  const { userId, tutorProfileData } = inputData;
  
  try {
    const { data: tokenData } = await authClient.token();
    
    const { data: response, error: resError } = await apiFetch<TutorProfile>(`/api/tutors/user/${userId}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${tokenData?.token}`
        },
        body: tutorProfileData
    });
     if (resError) {
       return { error: resError };
     }
     return { data: response }
  } catch (error) {
    return { error: { 
      status: (error as any)?.status || 500,
      message: (error as Error).message || "Error updating tutor profile" 
    } }
  }
};

export const updateTutorAvailability = async (inputData: UpdateTutorAvailabilitySchema): Promise<APIResponse<Availability[]>> => {
  const { tutorID, availabilityData } = inputData;
  
  try {
    const { data: tokenData } = await authClient.token();
    
    const { data: response, error} = await apiFetch<{availability: Availability[]}>(`/api/tutors/${tutorID}/availability`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${tokenData?.token}`
        },
        body: availabilityData
    });

    if (error) {
      return { error };
    }
    return { data: response?.availability }
  } catch (error) {
    return { error: { 
      status: (error as any)?.status || 500,
      message: (error as Error).message || "Error updating tutor profile" 
    } }
  }
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

  console.log('Selected Date:', selectedDate)

  console.log('Year, Month, Day:', year, month, day)

  const date = new Date(year, month - 1, day);
  const startOfWeek = new Date(date);

  startOfWeek.setDate(date.getDate() - date.getDay());

  return Array.from({ length: 7 }, (_, i) => {
    const currentDate = new Date(startOfWeek);
    currentDate.setDate(startOfWeek.getDate() + i);

    return currentDate;
  });
};