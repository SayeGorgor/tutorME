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
  APIResponse
} from "@/lib/types";

type UpdateTutorAvailabilitySchema = {
  tutorID: number;
  availabilityData: {
    availability: {
      type: "weekly" | "custom";
      dayOfTheWeek?: number;
      date?: string;
      startTime: number;
      endTime: number;
      timezone: string;
    }[]
  }
};

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
    
    const { data: response, error} = await apiFetch<Availability[]>(`/api/tutors/${tutorID}/availability`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${tokenData?.token}`
        },
        body: availabilityData
    });

    if (error) {
      return { error };
    }
    return { data: response }
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