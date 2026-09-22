export type Location = {
    city: string;
    state: string;
    zip: string;
    country: string;
    latitude: number;
    longitude: number;
}

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
  userId: number;
  intro: string;
  bio: string;
  price: number;
  user: User;
};
