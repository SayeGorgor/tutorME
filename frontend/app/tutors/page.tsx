'use client';

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LANGUAGES } from "@/constants/languages";
import type { Location, User } from "@/lib/types";
import TutorCard from "@/components/TutorCard";
import { getTutors } from "@/lib/api/actions/client-actions";

export default function TutorsPage() {
    const searchParams = useSearchParams();
    const subject = searchParams.get("subject");
    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const latitude = searchParams.get("lat");
    const longitude = searchParams.get("long");

    const testLocation: Location = { city: "Stone Mountain", state: "GA", zip: "30087", country: "US", latitude: 33.8049, longitude: -84.1556 };

    const [maxDistance, setMaxDistance] = useState(25);
    const [tutors, setTutors] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTutors = async () => {
            setIsLoading(true);
            try {
                const tutorData = await getTutors();
                setTutors(tutorData);
            } catch (error) {
                console.error("Failed to fetch tutors:", error);
            }
            setIsLoading(false);
        };
        fetchTutors();
    }, []);


    return (
        <div 
            id="page"
            className="flex h-full gap-6 p-6 bg-blue-100"
        >
            <div 
                id="filter-column"
                className="flex-1 p-4 bg-white rounded-xl h-fit"
            >
                <h2 className="text-lg font-bold mb-2">Filters</h2>
                <form id="filter-form" className="flex flex-col gap-4">
                    <fieldset>
                        <legend className="font-bold">Session Type</legend>
                        <label className="flex items-center gap-2">
                            <input type="radio" name="session-type" value="online" /> Online
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="radio" name="session-type" value="in-person" /> In-Person
                        </label>
                    </fieldset>

                    <fieldset>
                        <legend className="font-bold">Price</legend>
                        <label className="flex items-center gap-2">
                            <input type="radio" name="session-type" value="online" /> Online
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="radio" name="session-type" value="in-person" /> In-Person
                        </label>
                    </fieldset>

                    <label className="flex flex-col">
                        <span className="font-bold">Distance</span>
                        <input type="range" name="distance" min="0" max="100" value={maxDistance} onChange={(e) => setMaxDistance(Number(e.target.value))} />
                        <span>{maxDistance} miles</span>
                    </label>

                    <label className="flex flex-col">
                        <span className="font-bold">Additional Languages Spoken</span>
                        <select name="additional-language" className="border p-2 rounded">
                            {LANGUAGES.map((lang) => (
                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                        </select>
                    </label>

                    <button type="submit" className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 cursor-pointer">
                        Apply Filters
                    </button>
                </form>
            </div>
            
            <div 
                id="tutors-column"
                className="flex flex-col gap-4 flex-4"
            >
                <div className="flex flex-col">
                    <h2 className="text-2xl font-bold">
                        {subject} tutors in {city}, {state}
                    </h2>
                    {!isLoading && (
                        <p className="text-gray-700">
                            {tutors.length} tutors match your search
                        </p>
                    )}
                </div>
                <ul id="tutor-list" className="flex flex-col min-h-0 gap-4 overflow-y-auto scrollbar-none">
                    {isLoading ? (
                        <p>Loading tutors...</p>
                    ) : (
                        tutors.map((tutor) => (
                            <TutorCard
                                key={tutor.id}
                                id={tutor.id}
                                firstName={tutor.firstName}
                                lastName={tutor.lastName}
                                subject={subject}
                                location={testLocation}
                            />
                        ))
                    )}
                </ul>
            </div>

            <div 
                id="map"
                className="flex-2 p-4 bg-white font-bold text-center rounded-xl"
            >
                <h2>Map View</h2>
            </div>
        </div>
    );
}