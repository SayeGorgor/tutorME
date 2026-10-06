'use client';

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LANGUAGES } from "@/constants/languages";
import type { Location, User, TutorProfile } from "@/lib/types";
import TutorCard from "@/components/TutorCard";
import { getTutors } from "@/lib/api/actions/client-actions";

import styles from "./TutorPage.module.css";

export default function TutorsPage() {
    const searchParams = useSearchParams();
    const subject = searchParams.get("subject");
    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const latitude = searchParams.get("lat");
    const longitude = searchParams.get("long");

    const testLocation: Location = { city: "Stone Mountain", state: "GA", zip: "30087", country: "US", latitude: 33.8049, longitude: -84.1556 };

    const [maxDistance, setMaxDistance] = useState(25);
    const [tutors, setTutors] = useState<TutorProfile[]>([]);

    const [maxPrice, setMaxPrice] = useState(200);
    const [minPrice, setMinPrice] = useState(10);

    const min = 10;
    const max = 200;
    const minPercent = ((minPrice - min) / (max - min)) * 100;
    const maxPercent = ((maxPrice - min) / (max - min)) * 100;

    const [hasError, setHasError] = useState(false);
    const [sysMessage, setSysMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTutors = async () => {
            setIsLoading(true);
            const { data: tutorData, error } = await getTutors();
            if (error) {
                setHasError(true);
                setSysMessage(error.message);
                setIsLoading(false);
                return;
            }

            setTutors(tutorData ?? []);
            setHasError(false);
            setSysMessage("");
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

                    <fieldset className="flex flex-col gap-2">
                        <legend className="font-bold">Price</legend>
                        <div className="group relative">
                            {/* Background track */}
                            <div className="absolute top-2 -translate-y-1/2 h-2 w-full bg-gray-100 border border-gray-400/75 group-hover:border-gray-400 rounded-full" />

                            {/* Selected range */}
                            <div
                            className="absolute top-2 -translate-y-1/2 h-2 bg-blue-500 group-hover:bg-blue-700 rounded-full"
                            style={{
                                left: `${minPercent}%`,
                                width: `${maxPercent - minPercent}%`,
                            }}
                            />

                            <input
                            type="range"
                            min={min}
                            max={max}
                            step={5}
                            value={minPrice}
                            onChange={(e) =>
                                setMinPrice(Math.min(Number(e.target.value), maxPrice - 5))
                            }
                            className={`${styles["range-slider"]} absolute w-full appearance-none bg-transparent`}
                            />

                            <input
                            type="range"
                            min={min}
                            max={max}
                            step={5}
                            value={maxPrice}
                            onChange={(e) =>
                                setMaxPrice(Math.max(Number(e.target.value), minPrice + 5))
                            }
                            className={`${styles["range-slider"]} absolute w-full appearance-none bg-transparent`}
                            />
                        </div>
                        <span className="mt-3">${minPrice} - ${maxPrice}</span>
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
                                key={tutor.userId}
                                id={tutor.userId}
                                firstName={tutor.user.firstName}
                                lastName={tutor.user.lastName}
                                price={tutor.price}
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