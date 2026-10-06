'use client';

import { useState, useEffect, useRef } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/dist/client/link";

import RatingStar from "@/components/RatingStar";
import ChoiceArrowsIcon from "@/public/icons/choice_arrows_icon.svg";
import CalendarIcon from "@/public/icons/calendar_icon.svg";

import type { TutorProfile, AvailabilityTimeRange } from "@/lib/types";
import { AVAILABILITY_TIMES, DAYS } from "@/constants/constants";
import { 
    getTutorByUserId, 
    formatToDateString,
    getAvailabilityWeekDates,
    getAvailabilityCalendarCellSize,
} from "@/lib/api/actions/client-actions";

export default function TutorProfilePage({ 
    params, 
} : {
    params: Promise<{ id: number }>;
}) {
    const router = useRouter();

    const times = AVAILABILITY_TIMES;
    const days = DAYS;

    const dateInputRef = useRef<HTMLInputElement>(null);
    
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [tutorProfile, setTutorProfile] = useState<TutorProfile | null>(null);
    const [hasError, setHasError] = useState(false);
    const [sysMessage, setSysMessage] = useState("");
    const [id, setId] = useState<number | null>(null);

    const [availabilityTimeRanges, setAvailabilityTimeRanges] = useState<AvailabilityTimeRange[]>([]);
    const [availabilityType, setAvailabilityType] = useState<"weekly" | "custom">("weekly");
    const [showAvailabilityTypeDropdown, setShowAvailabilityTypeDropdown] = useState(false);
    const [availabilityWeekDates, setAvailabilityWeekDates] = useState<Date[]>([]);
    const [currentTimePage, setCurrentTimePage] = useState(0);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString());
    
    const weekDates = getAvailabilityWeekDates(selectedDate);
    const timePages = Array.from(
        {length: Math.ceil(times.length / 6)},
        (_, i) => times.slice(
            i * 6,
            i * 6 + 6
        )
    );
    
    useEffect(() => {
        const fetchTutorProfile = async () => {
            const { id } = await params;
            setIsLoading(true);

            const { data: tutorProfileData, error } = await getTutorByUserId(id);
            if (error) {
                setHasError(true);
                setSysMessage(error.message);
                setIsLoading(false);
                return;
            }
            
            setTutorProfile(tutorProfileData ?? null);
            setHasError(false);
            setSysMessage("");
            setIsLoading(false);
        };
        fetchTutorProfile();

    }, [params]);

    return (
        <div className="flex flex-col p-8 gap-2">
            <button 
                className="self-start cursor-pointer text-blue-700 hover:underline"
                onClick={() => router.back()}
            >
                {"< Back to Search"}
            </button>
            {isLoading ? (
                <p>Loading...</p>
            ) : tutorProfile ? (
                <>
                    <div 
                        id="tutor-profile-card" 
                        className="flex justify-between p-6 bg-blue-100 rounded-lg"
                    >
                        <div 
                            id="tutor-profile-card-left"
                            className="flex gap-6"
                        >
                            <Image 
                                id="pfp" 
                                src="/icons/default_pfp_icon.svg" 
                                alt={`${tutorProfile.user.firstName} ${tutorProfile.user.lastName}'s Profile Picture`} 
                                width={210} 
                                height={210}
                                className="bg-gray-500 rounded-lg"
                            />
                            <div
                                id="tutor-info"
                                className="flex flex-col gap-2"
                            >
                                <div className="flex flex-col gap-1">
                                    <p className="font-bold text-3xl">{tutorProfile.user.firstName} {tutorProfile.user.lastName}</p>

                                    <div 
                                        id='verification-badge'
                                        className="bg-blue-200 w-fit py-1 px-3 rounded-2xl text-sm text-blue-700 font-bold"
                                    >
                                        Verified Tutor
                                    </div>
                                </div>

                                <p className="text-lg font-bold">SAT Prep & Algebra Tutor</p>

                                <div className="flex gap-2 items-center">
                                    <div className="flex gap-1 items-center">
                                        <RatingStar filled={true} height={3} width={3} />
                                        <p className="text-sm">4.9 (124 reviews)</p>
                                    </div>
                                    
                                    <p className="mt-1">•</p>

                                    <p className="text-sm">2.4 mi away</p>

                                    <p className="mt-1">•</p>

                                    <p className="text-sm">Online Available</p>
                                </div>
                                
                                <p className="w-150">{tutorProfile.intro}</p>
                            </div>
                        </div>
                        <div id="tutor-profile-card-right" className="flex flex-col">
                            <p className="text-lg self-end text-gray-600"><span className="font-bold text-2xl text-black">${tutorProfile.price}</span> / hr</p>

                            <button className="mt-4 bg-blue-700 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-300 cursor-pointer">
                                Book a Session
                            </button>

                            <Link 
                                href={`/`}
                                className="self-center mt-2 text-blue-700 text-md hover:underline"
                            >
                                Message {tutorProfile.user.firstName}
                            </Link>
                        </div>
                    </div>

                    <div id="additional-info-section" className="flex mt-4">
                        <div id="additional-info-section-left" className="flex flex-5 flex-col gap-5">
                            <div className="flex flex-col gap-1">
                                <p className="text-xl font-bold">About {tutorProfile.user.firstName}</p>
                                <p className="text-sm">{tutorProfile.bio}</p>
                            </div>

                            <div className="flex flex-col gap-1">
                                <p className="text-xl font-bold">Subjects</p>
                                <ul className="flex gap-2">
                                    <li>
                                        <div 
                                            className="bg-blue-200 w-fit py-1 px-3 rounded-2xl text-sm text-blue-700 font-bold"
                                        >
                                            Algebra
                                        </div>
                                    </li>
                                    <li>
                                        <div 
                                            className="bg-blue-200 w-fit py-1 px-3 rounded-2xl text-sm text-blue-700 font-bold"
                                        >
                                            Geometry
                                        </div>
                                    </li>
                                    <li>
                                        <div 
                                            className="bg-blue-200 w-fit py-1 px-3 rounded-2xl text-sm text-blue-700 font-bold"
                                        >
                                            SAT Prep
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            <div className="flex flex-col gap-1">
                                <p className="text-xl font-bold">Reviews</p>
                            </div>
                        </div>
                        <div id="additional-info-section-right" className="flex flex-3 flex-col justify-center gap-1 ml-10">
                            <h3 className="text-xl font-bold">Availability - <span className="text-lg">{currentTimePage > 3 ? 'PM' : 'AM'}</span></h3>

                            
                            <div className="grid grid-cols-8 gap-2">
                                <div className="flex justify-center items-center gap-6 col-span-8">
                                    <div className="relative flex items-center">
                                        <button 
                                            className="flex items-center cursor-pointer"
                                            onClick={() => setShowAvailabilityTypeDropdown(!showAvailabilityTypeDropdown)}
                                        >
                                            <h4 className="text-lg font-semibold">
                                                {availabilityType === "weekly" ? "Weekly" : "Custom"}
                                            </h4>
                                            <ChoiceArrowsIcon className="w-5 h-5" />
                                        </button>

                                        <div
                                            id="availability-type-dropdown"
                                            className={`absolute top-[-2.5] left-[-2.5] mt-2 w-40 bg-white border border-gray-700 rounded-lg shadow-lg z-10 ${showAvailabilityTypeDropdown ? 'block' : 'hidden'}`}
                                        >
                                            <div
                                                className="px-4 py-2 cursor-pointer rounded-t-lg hover:bg-gray-200"
                                                onClick={() => {
                                                    setAvailabilityType("weekly");
                                                    setShowAvailabilityTypeDropdown(false);
                                                }}
                                            >
                                                Weekly
                                            </div>
                                            <div
                                                className="px-4 py-2 cursor-pointer rounded-b-lg hover:bg-gray-200"
                                                onClick={() => {
                                                    setAvailabilityType("custom");
                                                    setShowAvailabilityTypeDropdown(false);
                                                }}
                                            >
                                                Custom
                                            </div>
                                        </div>
                                    </div>

                                    {availabilityType === "custom" && (
                                        <div className="flex gap-2">
                                            <h3 className="text-lg items-center font-semibold">
                                                {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {weekDates[6].getFullYear()}
                                            </h3>
                                            <div>
                                                <button 
                                                    onClick={() => dateInputRef.current?.showPicker()}
                                                    className="cursor-pointer"
                                                    aria-label="Select date"
                                                >
                                                    <CalendarIcon className="w-6 h-6" />
                                                </button>
                                                <input
                                                    ref={dateInputRef}
                                                    type="date"
                                                    value={selectedDate}
                                                    onChange={(e) => setSelectedDate(e.target.value)}
                                                    className="sr-only"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={() => setCurrentTimePage(currentTimePage > 0 ? currentTimePage - 1 : 7)}
                                    className="flex items-center justify-center font-semibold h-6 text-center cursor-pointer"
                                >
                                    &lt;
                                </button>
                                <div className="overflow-hidden h-6 col-span-6">
                                    <div
                                        className="flex transition-transform duration-300 ease-in-out"
                                        style={{
                                            transform: `translateX(-${currentTimePage * 100}%)`,
                                        }}
                                    >
                                        {timePages.map((page, pageIndex) => (
                                            <div key={pageIndex} className="grid grid-cols-6 gap-2 shrink-0 w-full">
                                                {page.map((time, timeIndex) => (
                                                    <div
                                                        key={timeIndex}
                                                        className="shrink-0 text-center font-semibold h-6"
                                                    >
                                                        {time}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div> 
                                <button 
                                    onClick={() => setCurrentTimePage(currentTimePage < 7 ? currentTimePage + 1 : 0)}
                                    className="flex items-center justify-center font-semibold h-6 text-center cursor-pointer"
                                >
                                    &gt;
                                </button>

                                {availabilityType === 'weekly' ? (
                                    days.map((day, dayIndex) => (
                                        <React.Fragment key={day}>
                                            <div className="flex items-center justify-center font-semibold h-10 text-center">{day}</div>
                                            {Array.from({ length: 6 }).map((_, column) => {
                                                const calendarIndex = dayIndex * 6 + column;
                                                const timeIndex = 6 * currentTimePage * 30 + column * 30;

                                                const isActive = tutorProfile?.availability.some(availability =>
                                                    availability.type === "weekly" &&
                                                    availability.dayOfTheWeek === dayIndex &&
                                                    availability.startTime <= timeIndex &&
                                                    availability.endTime >= timeIndex
                                                );

                                                const leftTimeIndex = timeIndex - 30;
                                                const rightTimeIndex = timeIndex + 30;

                                                const hasLeftNeighbor =
                                                    column > 0 &&
                                                    tutorProfile?.availability.some(availability =>
                                                        availability.type === "weekly" &&
                                                        availability.dayOfTheWeek === dayIndex &&
                                                        availability.startTime <= leftTimeIndex &&
                                                        availability.endTime >= leftTimeIndex
                                                    );

                                                const hasRightNeighbor =
                                                    column < 5 &&
                                                    tutorProfile?.availability.some(availability =>
                                                        availability.type === "weekly" &&
                                                        availability.dayOfTheWeek === dayIndex &&
                                                        availability.startTime <= rightTimeIndex &&
                                                        availability.endTime >= rightTimeIndex
                                                    );

                                                return (
                                                    <div
                                                        key={calendarIndex}
                                                        className={`h-10 ${getAvailabilityCalendarCellSize(isActive, hasLeftNeighbor, hasRightNeighbor)}`}
                                                    ></div>
                                                );
                                            })}
                                            <div className="h-10"></div>
                                        </React.Fragment>
                                    )))
                                : (
                                    weekDates.map((date, dateIndex) => (
                                        <React.Fragment key={dateIndex}>
                                            <div className="flex items-center justify-center font-semibold h-10 text-center">
                                                {date.toLocaleDateString('en-US', {
                                                    weekday: 'short'
                                                })}
                                            </div>
                                            {Array.from({ length: 6 }).map((_, column) => {
                                                const calendarIndex = dateIndex * 6 + column;
                                                const timeIndex = 6 * currentTimePage * 30 + column * 30;

                                                const isActive = tutorProfile?.availability.some(availability =>
                                                    availability.type === "custom" &&
                                                    availability.date === formatToDateString(date) &&
                                                    availability.startTime <= timeIndex &&
                                                    availability.endTime >= timeIndex
                                                );

                                                const leftTimeIndex = timeIndex - 30;
                                                const rightTimeIndex = timeIndex + 30;

                                                const hasLeftNeighbor =
                                                    column > 0 &&
                                                    tutorProfile?.availability.some(availability =>
                                                        availability.type === "custom" &&
                                                        availability.date === formatToDateString(date) &&
                                                        availability.startTime <= leftTimeIndex &&
                                                        availability.endTime >= leftTimeIndex
                                                    );

                                                const hasRightNeighbor =
                                                    column < 5 &&
                                                    tutorProfile?.availability.some(availability =>
                                                        availability.type === "custom" &&
                                                        availability.date === formatToDateString(date) &&
                                                        availability.startTime <= rightTimeIndex &&
                                                        availability.endTime >= rightTimeIndex
                                                    );

                                                return (
                                                    <div
                                                        key={calendarIndex}
                                                        className={`h-10 cursor-pointer ${getAvailabilityCalendarCellSize(isActive, hasLeftNeighbor, hasRightNeighbor)}`}
                                                    ></div>
                                                );
                                            })}
                                            <div className="flex items-center justify-center font-semibold h-10 text-center">{date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}</div>
                                        </React.Fragment>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <p>Tutor profile not found.</p>
            )}
        </div>
    )
}