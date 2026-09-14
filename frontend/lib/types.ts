export type Location = {
    city: string;
    state: string;
    zip: string;
    country: string;
    latitude: number;
    longitude: number;
}

export type Language = {
  code: string;
  name: string;
};

export type Subject = {
  id: number;
  name: string;
  category: string;
}

export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  timezone: string;
  phoneNumber?: string;
  subjects?: Subject[];
}

export type TutorProfile = {
  userId: number;
  intro: string;
  bio: string;
  price: number;
  user: User;
};
