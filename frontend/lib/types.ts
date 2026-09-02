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

/*-----------------------PROPS--------------------*/
export type TutorCardProps = {
    id: number;
    firstName: string;
    lastName: string;
    description: string;
    subject: string;
    pfp: string | null;
    location: Location | null;
    languages: Language[] | null;
}