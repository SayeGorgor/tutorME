export type Location = {
    city: string;
    state: string;
    zip: string;
    country: string;
    latitude: number;
    longitude: number;
}

export type WeeklyAvailability = {
  id: number;
  tutorId: number;
  type: "weekly";
  dayOfTheWeek: number;
  startTime: number;
  endTime: number;
  timezone: string;
};

export type CustomAvailability = {
  id: number;
  tutorId: number;
  type: "custom";
  date: string;
  startTime: number;
  endTime: number;
  timezone: string;
};

export type Availability = WeeklyAvailability | CustomAvailability;

export type Review = {
  id: number;
  rating: number;
  comment: string;
  author: User;
};

export type Language = {
  code: string;
  name: string;
};

export type Subject = {
  id: number;
  name: string;
  category: string;
}

export type UserRole = "student" | "tutor" | "admin";

export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  timezone: string;
  phoneNumber?: string;
  subjects?: Subject[];
  reviewsWritten?: Review[];
  reviewsReceived?: Review[];
}

export type CreateUserSchema = {
  authID: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  timezone: string;
};

export type TutorProfile = {
  id: number;
  userId: number;
  intro: string;
  bio: string;
  price: number;
  user: User;
  availability: Availability[];
};

export type UpdateTutorProfileSchema = {
  userId: number,
  tutorProfileData: {
    intro?: string;
    bio?: string;
    price?: number;
    availability?: Availability[];
  }
};

export type CustomTimeRange = {
    type: "custom";
    date: string;
    startTime: number;
    endTime: number;
    timezone: string;
};

export type WeeklyTimeRange = {
    type: "weekly";
    dayOfTheWeek: number;
    startTime: number;
    endTime: number;
    timezone: string;
};

export type AvailabilityTimeRange = WeeklyTimeRange | CustomTimeRange;

export type UpdateTutorAvailabilitySchema = {
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

export type APIError = {
  status?: number;
  message: string;
};

export type APIResponse<T> = {
  data?: T;
  error?: APIError;
};