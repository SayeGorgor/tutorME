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
  accountPurpose?: "self" | "guardian" | "tutor" | null;
  adultAttestedAt?: string | null;
  termsVersion?: string | null;
  termsAcceptedAt?: string | null;
  phoneNumber?: string;
  subjects?: Subject[];
  reviewsWritten?: Review[];
  reviewsReceived?: Review[];
}

export type CreateUserSchema = {
  adultConfirmed: boolean;
  termsAccepted: boolean;
  termsVersion: string;
  accountPurpose: "self" | "guardian" | "tutor";
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
  isDemo: boolean;
  onlineEnabled: boolean;
  inPersonEnabled: boolean;
  serviceArea: ServiceArea | null;
  travelRadiusMiles: number;
  meetingPreferences: string | null;
  subjects: Subject[];
  availability: Availability[];
};

export type UpdateTutorProfileSchema = {
  userId: number,
  tutorProfileData: {
    intro?: string;
    bio?: string;
    price?: number;
    subjectIds?: number[];
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
  code?: string;
  status?: number;
  message: string;
};

export type APIResponse<T> = {
  data?: T;
  error?: APIError;
};

export type ServiceArea = {
  id: string; name: string; displayName?: string; displayLabel?: string; region: string; country: string; postalCode: string | null;
  latitude: number; longitude: number; source: string;
};
export type LocationPreferences = {
  onlineEnabled: boolean; inPersonEnabled: boolean; serviceAreaId: string | null;
  placeId?: string | null; travelRadiusMiles: number; meetingPreferences: string | null; publicAreaConsent: boolean;
};
export type TutorSearchItem = TutorProfile & { distanceMiles: number | null; inPersonMatch: boolean };
export type TutorSearchResponse = { items: TutorSearchItem[]; total: number; limit: number; offset: number };

export type Booking = {
  id: string; studentId: number; tutorId: number; mode: "online" | "in-person";
  startsAt: string; endsAt: string; status: "pending" | "confirmed" | "declined" | "cancelled" | "completed" | "expired";
  subjectId?: number | null; subjectNameSnapshot?: string | null;
  hourlyRateSnapshot?: string | null; currencySnapshot?: string | null;
  durationMinutesSnapshot?: number | null; sessionAmountSnapshot?: string | null;
  meetingDetails: string | null; studentName: string; tutorName: string; createdAt: string;
};

export type RegistrationStatus =
  | { status: "complete"; role: UserRole }
  | { status: "needs_completion"; email: string; name: string }
  | { status: "EMAIL_VERIFICATION_REQUIRED" | "PROVIDER_EMAIL_UNAVAILABLE" | "PROVIDER_NAME_UNAVAILABLE"; message: string };
export type CompleteRegistrationInput = {
  firstName: string; lastName: string; role: "student" | "tutor"; timezone: string;
  adultConfirmed: boolean; termsAccepted: boolean; termsVersion: string;
  accountPurpose: "self" | "guardian" | "tutor";
};
