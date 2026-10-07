'use client';

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LANGUAGES } from "@/constants/languages";
import type { Location, TutorProfile } from "@/lib/types";
import TutorCard from "@/components/TutorCard";
import ResponsivePanel from "@/components/ResponsivePanel";
import { getTutors } from "@/lib/api/actions/client-actions";

import styles from "./TutorPage.module.css";

export default function TutorsPage() {
    const searchParams = useSearchParams();
    const subject = searchParams.get("subject");
    const city = searchParams.get("city");
    const state = searchParams.get("state");

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
            className="grid min-w-0 flex-1 grid-cols-1 items-start gap-4 bg-blue-100 p-4 text-black sm:gap-6 sm:p-6 lg:grid-cols-[minmax(13rem,1fr)_minmax(0,4fr)] xl:grid-cols-[minmax(13rem,1fr)_minmax(0,4fr)_minmax(12rem,2fr)]"
        >
            <ResponsivePanel title="Filters">
                <form id="filter-form" className="flex flex-col gap-4 [&_fieldset]:min-w-0 [&_select]:min-h-11 [&_select]:w-full [&_select]:min-w-0 [&_select]:max-w-full [&_label]:min-h-11 lg:[&_label]:min-h-0 [&_button]:min-h-11" onSubmit={(event) => event.preventDefault()}>
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
                            aria-label="Minimum price"
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
                            aria-label="Maximum price"
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
            </ResponsivePanel>
            
            <div 
                id="tutors-column"
                className="flex min-w-0 flex-col gap-4 [overflow-wrap:anywhere]"
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
                <ul id="tutor-list" className="flex min-w-0 flex-col gap-4">
                    {isLoading ? (
                        <li role="status">Loading tutors...</li>
                    ) : (
                        hasError ? <li role="alert" className="break-words text-red-700">{sysMessage}</li> : tutors.length === 0 ? <li>No tutors match your search.</li> : tutors.map((tutor) => (
                            <li key={tutor.userId} className="min-w-0">
                                <TutorCard
                                    id={tutor.userId}
                                    firstName={tutor.user.firstName}
                                    lastName={tutor.user.lastName}
                                    price={tutor.price}
                                    subject={subject}
                                    location={testLocation}
                                />
                            </li>
                        ))
                    )}
                </ul>
            </div>

            <div 
                id="map"
                className="min-h-48 min-w-0 rounded-xl bg-white p-4 text-center font-bold lg:col-span-2 xl:col-span-1 xl:self-stretch"
            >
                <h2>Map View</h2>
            </div>
        </div>
    );
}