'use client';
import { subjectSummary } from "@/lib/subject-summary";
import TutorLocationBadges from "@/components/TutorLocationBadges";

import { useState, useEffect } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import BookingRequest from "@/components/BookingRequest";
import { areaLabel } from "@/components/ServiceAreaPicker";
import AvailabilityControls from "@/components/AvailabilityControls";

import type { TutorProfile } from "@/lib/types";
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

    
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [tutorProfile, setTutorProfile] = useState<TutorProfile | null>(null);
    const [hasError, setHasError] = useState(false);
    const [sysMessage, setSysMessage] = useState("");

    const [availabilityType, setAvailabilityType] = useState<"weekly" | "custom">("weekly");
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
        <div className="location-ui mx-auto flex w-full max-w-[100rem] min-w-0 flex-col gap-2 p-4 sm:p-6 lg:p-8 [overflow-wrap:anywhere]">
            <button 
                className="min-h-11 lg:min-h-0 self-start cursor-pointer text-blue-700 hover:underline"
                onClick={() => router.back()}
            >
                {"< Back to Search"}
            </button>
            {isLoading ? (
                <p role="status">Loading...</p>
            ) : tutorProfile ? (
                <>
                    <div 
                        id="tutor-profile-card" 
                        className="flex min-w-0 flex-col justify-between gap-6 rounded-lg bg-blue-100 p-4 text-black sm:p-6 xl:flex-row"
                    >
                        <div 
                            id="tutor-profile-card-left"
                            className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:gap-6"
                        >
                            <Image 
                                id="pfp" 
                                src="/icons/default_pfp_icon.svg" 
                                alt={`${tutorProfile.user.firstName} ${tutorProfile.user.lastName}'s Profile Picture`} 
                                width={210} 
                                height={210}
                                className="h-32 w-32 max-w-none shrink-0 self-start rounded-lg bg-gray-500 object-cover sm:h-[210px] sm:w-[210px]"
                            />
                            <div
                                id="tutor-info"
                                className="flex min-w-0 flex-col gap-2"
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-bold text-3xl">{tutorProfile.user.firstName} {tutorProfile.user.lastName}</p>
                                        {tutorProfile.isDemo && <span className="demo-badge shrink-0" title="Fictional tutor, not available for genuine appointments">Demo Profile</span>}
                                    </div>
                                    <TutorLocationBadges tutor={tutorProfile} />

                                </div>
                                <p className="text-lg font-bold">{subjectSummary(tutorProfile.subjects)}</p>
                                <p className="text-sm">{[tutorProfile.onlineEnabled && "Online lessons", tutorProfile.inPersonEnabled && "In-person lessons"].filter(Boolean).join(" / ")}</p>
                                {tutorProfile.inPersonEnabled && tutorProfile.serviceArea && <div className="location-ui rounded-xl bg-blue-50 p-3 text-sm"><p>{areaLabel(tutorProfile.serviceArea)} / Travels up to {tutorProfile.travelRadiusMiles} miles</p><p className="text-slate-600">Approximate public service area, not a meeting address.</p>{tutorProfile.meetingPreferences && <p>{tutorProfile.meetingPreferences}</p>}</div>}
                                <p className="w-full max-w-[37.5rem]">{tutorProfile.intro?.trim() || "This tutor has not added an introduction yet."}</p>
                            </div>
                        </div>
                        <div id="tutor-profile-card-right" className="flex shrink-0 flex-col gap-1 xl:max-w-56">
                            <p className="text-lg text-gray-600 xl:self-end"><span className="font-bold text-2xl text-black">${tutorProfile.price}</span> / hr</p>

                            <p className="mt-4 text-sm text-slate-600">Tutor-listed rate; TutorME does not collect payments. Appointment requests require tutor approval.</p>
                        </div>
                    </div>

                    <BookingRequest tutor={tutorProfile} />
                    <div id="additional-info-section" className="flex min-w-0 flex-col gap-6 mt-4 2xl:flex-row 2xl:gap-10">
                        <div id="additional-info-section-left" className="flex min-w-0 flex-5 flex-col gap-5">
                            <div className="flex flex-col gap-1">
                                <p className="text-xl font-bold">About {tutorProfile.user.firstName}</p>
                                <p className="max-w-prose text-base">{tutorProfile.bio}</p>
                            </div>

                            <div className="flex flex-col gap-1">
                                <p className="text-xl font-bold">Subjects</p>
                                <ul className="flex flex-wrap gap-2">{tutorProfile.subjects.map(subject => <li key={subject.id} className="w-fit rounded-2xl bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">{subject.name}</li>)}                                </ul>
                            </div>

                            <div className="flex flex-col gap-1">
                                <p className="text-xl font-bold">Reviews</p>
                            </div>
                        </div>
                        <div id="additional-info-section-right" className="flex min-w-0 flex-3 flex-col justify-center gap-1 2xl:min-w-[39rem]">
                            <h3 className="text-xl font-bold ml-3.5">Availability - <span className="text-lg">{currentTimePage > 3 ? 'PM' : 'AM'}</span></h3>

                            
                            <AvailabilityControls type={availabilityType} onTypeChange={setAvailabilityType} selectedDate={selectedDate} onDateChange={setSelectedDate} />
                            <p className="text-sm text-slate-600">Scroll horizontally to view all availability times.</p>
                            <div className="calendar-scroll" role="region" aria-label="Tutor availability calendar" tabIndex={0}>
                            <div className="grid min-w-[34rem] grid-cols-8 gap-2">
                                <button 
                                    aria-label="Previous availability times" onClick={() => setCurrentTimePage(currentTimePage > 0 ? currentTimePage - 1 : 7)}
                                    className="flex min-h-11  items-center justify-center font-semibold text-center cursor-pointer"
                                >
                                    &lt;
                                </button>
                                <div className="flex min-h-11  items-center overflow-hidden col-span-6">
                                    <div
                                        className="flex w-full min-w-0 shrink-0 transition-transform duration-300 ease-in-out"
                                        style={{
                                            transform: `translateX(-${currentTimePage * 100}%)`,
                                        }}
                                    >
                                        {timePages.map((page, pageIndex) => (
                                            <div key={pageIndex} className="grid grid-cols-6 gap-2 shrink-0 w-full">
                                                {page.map((time, timeIndex) => (
                                                    <div
                                                        key={timeIndex}
                                                        className="shrink-0 text-center font-semibold min-h-6"
                                                    >
                                                        {time}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div> 
                                <button 
                                    aria-label="Next availability times" onClick={() => setCurrentTimePage(currentTimePage < 7 ? currentTimePage + 1 : 0)}
                                    className="flex min-h-11  items-center justify-center font-semibold text-center cursor-pointer"
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
                                                        className={`h-10 ${getAvailabilityCalendarCellSize(isActive, hasLeftNeighbor, hasRightNeighbor)}`}
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
                    </div>
                </>
            ) : (
                <p role={hasError ? "alert" : "status"}>{hasError ? sysMessage : "Tutor profile not found."}</p>
            )}
        </div>
    )
}
