'use client';

import React from "react";
import { useState, useEffect } from "react";

import Image from "next/image";

import { useCurrentUser } from "@/lib/context/UserContext";
import { TutorProfile, UpdateTutorAvailabilitySchema, AvailabilityTimeRange } from "@/lib/types";
import { 
    formatToDateString,
    getAvailabilityWeekDates,
    getAvailabilityCalendarCellSize,
    getTutorByUserId, 
    updateTutorProfile, 
    updateTutorAvailability
} from "@/lib/api/actions/client-actions";

import { subjectSummary } from "@/lib/subject-summary";
import TutorLocationBadges from "@/components/TutorLocationBadges";
import TutorRateEditor from "@/components/TutorRateEditor";
import TutorLocationSettings from "@/components/TutorLocationSettings";
import AvailabilityControls from "@/components/AvailabilityControls";
import EditIcon from "@/public/icons/edit_icon.svg";
import LoadingAnimationIcon from "@/public/icons/loading_animation_icon.svg";
import { AVAILABILITY_TIMES, DAYS } from "@/constants/constants";

type toggleSquaresWeeklyInput = {
    type: "weekly";
    timeIndex: number;
    dayIndex: number;
};

type toggleSquaresCustomInput = {
    type: "custom";
    timeIndex: number;
    date: string;
};

type toggleSquaresInput = toggleSquaresCustomInput | toggleSquaresWeeklyInput

export default function ProfilePage() {
    const { user } = useCurrentUser();

    const times = AVAILABILITY_TIMES;
    const days = DAYS;


    const [tutorProfile, setTutorProfile] = useState<TutorProfile | null>(null);
    const [isEditingIntro, setIsEditingIntro] = useState(false);
    const [introText, setIntroText] = useState("");
    const [isEditingAbout, setIsEditingAbout] = useState(false);
    const [aboutText, setAboutText] = useState("");

    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [systemMessage, setSystemMessage] = useState("");

    const [isLoadingAvailabilityUpdate, setIsLoadingAvailabilityUpdate] = useState(false);
    const [availabilityUpdateMessage, setAvailabilityUpdateMessage] = useState("");

    const [availabilityTimeRanges, setAvailabilityTimeRanges] = useState<AvailabilityTimeRange[]>([]);
    const [originalAvailabilityTimeRanges, setOriginalAvailabilityTimeRanges] = useState<AvailabilityTimeRange[]>([]);
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

    const normalizeRanges = (ranges: AvailabilityTimeRange[]) =>
        [...ranges].sort((a, b) => {
            if (a.type !== b.type) {
                return a.type.localeCompare(b.type);
            }

            if (a.type === "weekly" && b.type === "weekly") {
                if (a.dayOfTheWeek !== b.dayOfTheWeek) {
                    return a.dayOfTheWeek - b.dayOfTheWeek;
                }
            }

            if (a.type === "custom" && b.type === "custom") {
                if (a.date !== b.date) {
                    return a.date.localeCompare(b.date);
                }
            }

            return a.startTime - b.startTime;
        }
    );

    const isEditingAvailability = JSON.stringify(normalizeRanges(availabilityTimeRanges)) !== JSON.stringify(normalizeRanges(originalAvailabilityTimeRanges));

    useEffect(() => {
        const fetchTutorProfile = async () => {
            if (user) {
                setIsLoading(true);
                const { data, error } = await getTutorByUserId(user.id);
                if(error) {
                    setHasError(true);
                    setSystemMessage(error.message);
                    setIsLoading(false);
                    return;
                }

                setTutorProfile(data ?? null);
                setIntroText(data?.intro ?? "");
                setAboutText(data?.bio ?? "");
                const availabilities = (data?.availability ?? []).map(
                    ({id, tutorId, ...availability}) => availability
                );

                setAvailabilityTimeRanges(availabilities);
                setOriginalAvailabilityTimeRanges(availabilities);
                setIsLoading(false);
            }
        };
        fetchTutorProfile();
    }, [user]);

    const saveIntroChange = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const { data: updatedProfile, error: updateProfileError } = await updateTutorProfile({
            userId: tutorProfile!.userId,
            tutorProfileData: {
                intro: introText
            }
        });
        
        if (updateProfileError) {
           setHasError(true);
           setSystemMessage(updateProfileError.message);
           setIsLoading(false);
           return;
        }

        setTutorProfile(updatedProfile ?? null);
        setIsEditingIntro(false);
        setIntroText(updatedProfile?.intro ?? "");
        setIsLoading(false);
    };

    const saveAboutChange = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const { data: updatedProfile, error: updateProfileError } = await updateTutorProfile({
            userId: tutorProfile!.userId,
            tutorProfileData: {
                bio: aboutText
            }
        });
        
        if (updateProfileError) {
           setHasError(true);
           setSystemMessage(updateProfileError.message);
           setIsLoading(false);
           return;
        }

        setTutorProfile(updatedProfile ?? null);
        setIsEditingAbout(false);
        setAboutText(updatedProfile?.bio ?? "");
        setIsLoading(false);
    };

    // const saveAvailabilityChange = async (e: React.FormEvent<HTMLFormElement>) => {
    //     e.preventDefault();
    //     setIsLoading(true);
    //     const { data: updatedProfile, error: updateProfileError } = await updateTutorProfile({
    //         userId: tutorProfile!.userId,
    //         tutorProfileData: {
    //             availability: Array.from(activeSquares)
    //         }
    //     });

    //     if (updateProfileError) {
    //        setHasError(true);
    //        setSystemMessage(updateProfileError.message);
    //        setIsLoading(false);
    //        return;
    //     }

    //     setTutorProfile(updatedProfile ?? null);
    //     setIsLoading(false);
    // };

    const toggleSquare = (indexes: toggleSquaresInput) => {
        const { timeIndex } = indexes;

        if(!user) return;

        setAvailabilityTimeRanges((prev) => {
            //Determine if cell is within an existing availability range
            const range = prev.find((range) => 
                (
                    (range.type === "weekly" && indexes.type === "weekly" && range.dayOfTheWeek === indexes.dayIndex) || 
                    (range.type === "custom" && indexes.type === "custom" && range.date === indexes.date)
                ) && 
                timeIndex >= range.startTime && 
                timeIndex <= range.endTime
            );

            if(!range) { //Handle adding new availability range
                if(indexes.type === "weekly") {
                    const leftRange = availabilityTimeRanges.find((range) => 
                        range.type === "weekly" && range.dayOfTheWeek === indexes.dayIndex && range.endTime === (timeIndex - 30)
                    );
                    const rightRange = availabilityTimeRanges.find((range) => 
                        range.type === "weekly" && range.dayOfTheWeek === indexes.dayIndex && range.startTime === (timeIndex + 30)
                    );
                    
                    if(leftRange && rightRange) {
                        return [
                            ...prev.filter((range) => range !== leftRange && range !== rightRange),
                            {
                                type: "weekly",
                                dayOfTheWeek: indexes.dayIndex,
                                startTime: leftRange.startTime,
                                endTime: rightRange.endTime,
                                timezone: user.timezone
                            }
                        ];
                    }

                    if(leftRange) {
                        return [
                            ...prev.filter((range) => range !== leftRange),
                            {
                                type: "weekly",
                                dayOfTheWeek: indexes.dayIndex,
                                startTime: leftRange.startTime,
                                endTime: timeIndex,
                                timezone: user.timezone
                            }
                        ];
                    }

                    if(rightRange) {
                        return [
                            ...prev.filter((range) => range !== rightRange),
                            {
                                type: "weekly",
                                dayOfTheWeek: indexes.dayIndex,
                                startTime: timeIndex,
                                endTime: rightRange.endTime,
                                timezone: user.timezone
                            }
                        ];
                    }

                    return [...prev, {
                        type: "weekly",
                        dayOfTheWeek: indexes.dayIndex,
                        startTime: timeIndex,
                        endTime: timeIndex,
                        timezone: user.timezone
                    }];
                }

                const leftRange = availabilityTimeRanges.find((range) => 
                    range.type === "custom" && range.date === indexes.date && range.endTime === (timeIndex - 30)
                );
                const rightRange = availabilityTimeRanges.find((range) => 
                    range.type === "custom" && range.date === indexes.date && range.startTime === (timeIndex + 30)
                );

                if(leftRange && rightRange) {
                    return [
                        ...prev.filter((range) => range !== leftRange && range !== rightRange),
                        {
                            type: "custom",
                            date: indexes.date,
                            startTime: leftRange.startTime,
                            endTime: rightRange.endTime,
                            timezone: user.timezone
                        }
                    ];
                }

                if(leftRange) {
                    return [
                        ...prev.filter((range) => range !== leftRange),
                        {
                            type: "custom",
                            date: indexes.date,
                            startTime: leftRange.startTime,
                            endTime: timeIndex,
                            timezone: user.timezone
                        }
                    ];
                }

                if(rightRange) {
                    return [
                        ...prev.filter((range) => range !== rightRange),
                        {
                            type: "custom",
                            date: indexes.date,
                            startTime: timeIndex,
                            endTime: rightRange.endTime,
                            timezone: user.timezone
                        }
                    ];
                }

                return [
                    ...prev,
                    {
                        type: "custom",
                        date: indexes.date,
                        startTime: timeIndex,
                        endTime: timeIndex,
                        timezone: user.timezone
                    }
                ];
            }

            // Deletion logic
            const hasLeft = timeIndex > range.startTime;
            const hasRight = timeIndex < range.endTime;

            if(hasLeft && hasRight) {
                prev = prev.filter((prevRange) => prevRange !== range);
                if(range.type === "weekly") {
                    const leftRange = {
                        type: range.type,
                        dayOfTheWeek: range.dayOfTheWeek,
                        startTime: range.startTime,
                        endTime: timeIndex - 30,
                        timezone: user.timezone,
                    };

                    const rightRange = {
                        type: range.type,
                        dayOfTheWeek: range.dayOfTheWeek,
                        startTime: timeIndex + 30,
                        endTime: range.endTime,
                        timezone: user.timezone,
                    };
                    return [...prev, leftRange, rightRange];
                }

                const leftRange = {
                    type: range.type,
                    date: range.date,
                    startTime: range.startTime,
                    endTime: timeIndex - 30,
                    timezone: user.timezone,
                };

                const rightRange = {
                    type: range.type,
                    date: range.date,
                    startTime: timeIndex + 30,
                    endTime: range.endTime,
                    timezone: user.timezone,
                };

                return [...prev, leftRange, rightRange];
            }

            if(hasLeft) {
                prev = prev.filter((prevRange) => prevRange !== range);

                if(range.type === "weekly") {
                    const leftRange = {
                        type: range.type,
                        dayOfTheWeek: range.dayOfTheWeek,
                        startTime: range.startTime,
                        endTime: timeIndex - 30,
                        timezone: user.timezone,
                    };

                    return [...prev, leftRange];
                }

                const leftRange = {
                    type: range.type,
                    date: range.date,
                    startTime: range.startTime,
                    endTime: timeIndex - 30,
                    timezone: user.timezone,
                };

                return [...prev, leftRange];
            }

            if(hasRight) {
                prev = prev.filter((prevRange) => prevRange !== range);

                if(range.type === "weekly") {
                    const rightRange = {
                        type: range.type,
                        dayOfTheWeek: range.dayOfTheWeek,
                        startTime: timeIndex + 30,
                        endTime: range.endTime,
                        timezone: user.timezone,
                    };

                    return [...prev, rightRange];
                }

                const rightRange = {
                    type: range.type,
                    date: range.date,
                    startTime: timeIndex + 30,
                    endTime: range.endTime,
                    timezone: user.timezone,
                };

                return [...prev, rightRange];
            }

            prev = prev.filter((prevRange) => prevRange !== range);
            return prev;
        });
    }

    const handleAvailabilityUpdate = async(updateData: UpdateTutorAvailabilitySchema) => {
        if(isLoadingAvailabilityUpdate) return;
        
        setIsLoadingAvailabilityUpdate(true);
        const { data, error } = await updateTutorAvailability(updateData);
        setIsLoadingAvailabilityUpdate(false);
        if(error) {
            setHasError(true);
            setAvailabilityUpdateMessage("Availability Update Failed");
            return setTimeout(() => {
                setHasError(false);
                setAvailabilityUpdateMessage("");
            }, 3000);
        }
        
        const availabilities = (data ?? []).map(
            ({id, tutorId, ...availability}) => availability
        );

        setAvailabilityTimeRanges(availabilities);
        setOriginalAvailabilityTimeRanges(availabilities);
        setAvailabilityUpdateMessage("Availability Updated");
        setTimeout(() => {
            setAvailabilityUpdateMessage("");
        }, 3000);
    }

    return (
        <div className="location-ui touch-controls flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8 w-full [overflow-wrap:anywhere]">
            {systemMessage && <p role="alert" className="text-red-700">{systemMessage}</p>}
            {isLoading ? (
                <div className="h-full w-full flex justify-center items-center">
                    <LoadingAnimationIcon className="h-10 w-10" />
                </div>
            ) : tutorProfile ? (
                <>
                    <TutorLocationSettings tutor={tutorProfile} onSaved={setTutorProfile} />
                    <div 
                        id="tutor-profile-card" 
                        className="flex min-w-0 flex-col justify-between gap-6 p-4 sm:p-6 bg-blue-100 rounded-lg xl:flex-row"
                    >
                        <div 
                            id="tutor-profile-card-left"
                            className="flex min-w-0 flex-col gap-4 sm:flex-row sm:gap-6"
                        >
                            <Image 
                                id="pfp" 
                                src="/icons/default_pfp_icon.svg" 
                                alt={`${tutorProfile.user.firstName} ${tutorProfile.user.lastName}'s Profile Picture`} 
                                width={210} 
                                height={210}
                                className="h-32 w-32 shrink-0 self-start bg-gray-500 rounded-lg object-cover sm:h-[210px] sm:w-[210px]"
                            />
                            <div
                                id="tutor-info"
                                className="flex min-w-0 flex-1 flex-col gap-2"
                            >
                                <div className="flex flex-col gap-1">
                                    <p className="font-bold text-3xl">{tutorProfile.user.firstName} {tutorProfile.user.lastName}</p>

                                    <TutorLocationBadges tutor={tutorProfile} />
                                </div>

                                <p className="text-lg font-bold">{subjectSummary(tutorProfile.subjects)}</p>

                                <div className="flex flex-wrap gap-2 items-center">
                                    <div className="flex gap-1 items-center">
                                        <p className="text-sm">Tutor-provided profile information</p>
                                    </div>

                                    <p className="mt-1">•</p>

                                    <p className="text-sm">{[tutorProfile.onlineEnabled && "Online lessons", tutorProfile.inPersonEnabled && "In-person lessons"].filter(Boolean).join(" ? ")}</p>
                                </div>
                                
                                {isEditingIntro ? (
                                    <form className="flex min-w-0 flex-col gap-3 sm:flex-row" onSubmit={saveIntroChange}>
                                        <textarea
                                            aria-label="Tutor introduction"
                                            maxLength={255}
                                            placeholder="Share what you teach, who you help, and your teaching style."
                                            value={introText}
                                            onChange={(e) => setIntroText(e.target.value)}
                                            className="w-full min-w-0 min-h-24 resize-y p-3 border rounded-lg bg-white"
                                        />
                                        <div className="flex flex-col items-start justify-center">
                                            <button 
                                                type="submit"
                                                className="text-green-800 cursor-pointer hover:underline"
                                            >
                                                Save
                                            </button>
                                            <button 
                                                type="button"
                                                className="text-red-500 cursor-pointer hover:underline"
                                                onClick={() => {
                                                    setIsEditingIntro(false);
                                                    setIntroText(tutorProfile.intro);
                                                }}
                                            >
                                                Cancel  
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex min-w-0 items-start gap-2">
                                        <p className={`max-w-150 ${!tutorProfile.intro?.trim() ? "italic text-slate-500" : ""}`}>{tutorProfile.intro?.trim() ? tutorProfile.intro : "Introduce yourself in one or two sentences: share what you teach, who you help, and your teaching style."}</p>
                                        <button 
                                            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-slate-600 hover:text-blue-700"
                                            type="button" aria-label="Edit introduction"
                                            onClick={() => {
                                                setIsEditingIntro(!isEditingIntro)
                                                setIntroText(tutorProfile.intro);
                                            }}
                                        >
                                            <EditIcon 
                                                className="w-4 h-4" 
                                            />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div id="tutor-profile-card-right" className="flex flex-col">
                            <TutorRateEditor tutor={tutorProfile} onSaved={setTutorProfile} />
                        </div>
                    </div>

                    <div id="additional-info-section" className="flex min-w-0 flex-col gap-6 2xl:flex-row">
                        <div id="additional-info-section-left" className="flex min-w-0 flex-5 flex-col gap-5">
                            <div className="flex flex-col gap-1">
                                <p className="text-xl font-bold">About {tutorProfile.user.firstName}</p>
                                {isEditingAbout ? (
                                    <form onSubmit={saveAboutChange} className="flex flex-col gap-2">
                                        <textarea
                                            aria-label="About you and your tutoring experience"
                                            maxLength={1000}
                                            placeholder="Write a longer overview of yourself and your experience. Share your education, tutoring background, subject expertise, teaching approach, and how you help students reach their goals."
                                            value={aboutText}
                                            onChange={(e) => setAboutText(e.target.value)}
                                            className="border border-gray-500 rounded-lg text-sm p-2 h-55 bg-white"
                                        />
                                        <div className="flex gap-2">
                                            <button 
                                                type="submit"
                                                className="text-green-800 cursor-pointer hover:underline"
                                            >
                                                Save
                                            </button>
                                            <button
                                                type="button"
                                                className="text-red-500 cursor-pointer hover:underline"
                                                onClick={() => {
                                                    setIsEditingAbout(false);
                                                    setAboutText(tutorProfile.bio);
                                                }}
                                            >
                                                Cancel  
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex min-w-0 items-start gap-2">
                                        <p className={`max-w-150 whitespace-pre-line text-sm ${!tutorProfile.bio?.trim() ? "italic text-slate-500" : ""}`}>{tutorProfile.bio?.trim() ? tutorProfile.bio : "Write a longer overview of yourself and your experience. Share your education, tutoring background, subject expertise, teaching approach, and how you help students reach their goals."}</p>
                                        <button type="button" aria-label="Edit about section" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-slate-600 hover:text-blue-700" onClick={() => {
                                            setIsEditingAbout(true);
                                            setAboutText(tutorProfile.bio);
                                        }}>
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    <p className="text-xl font-bold">Subjects</p>
                                    <a href="#subjects-you-teach" className="text-sm font-semibold text-blue-700 hover:underline">Edit subjects</a>
                                </div>
                                {tutorProfile.subjects.length ? <ul className="flex flex-wrap gap-2">
                                    {tutorProfile.subjects.map(subject => <li key={subject.id} className="w-fit rounded-2xl bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">{subject.name}</li>)}
                                </ul> : <p className="text-sm text-slate-500">Add the subjects you teach using the form below.</p>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <p className="text-xl font-bold">Reviews</p>
                            </div>
                        </div>
                        <div id="additional-info-section-right" className="flex min-w-0 flex-3 2xl:min-w-[39rem] flex-col justify-center gap-3">
                            <div className="flex flex-wrap justify-between gap-3">
                                <h3 className="text-xl font-bold">Availability - <span className="text-lg">{currentTimePage > 3 ? 'PM' : 'AM'}</span></h3>

                                {availabilityUpdateMessage ? (
                                    <p className={`text-md ${hasError ? 'text-red-500' : 'text-green-700'}`}>{availabilityUpdateMessage}</p>
                                ) : (
                                    isEditingAvailability && (
                                        <div className="flex items-center gap-2 mr-2">
                                            <button 
                                                type="submit"
                                                className="text-green-800 cursor-pointer hover:underline"
                                                onClick={async() => handleAvailabilityUpdate({tutorID: tutorProfile.id, availabilityData: { availability: availabilityTimeRanges }})}
                                            >
                                                Save
                                            </button>
                                            {isLoadingAvailabilityUpdate ? (
                                                <LoadingAnimationIcon className="w-5 h-5" />
                                            ) : (
                                                <button 
                                                    className="text-red-500 cursor-pointer hover:underline"
                                                    onClick={() => setAvailabilityTimeRanges(originalAvailabilityTimeRanges)}
                                                >
                                                    Cancel  
                                                </button>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>

                            
                            <AvailabilityControls type={availabilityType} onTypeChange={setAvailabilityType} selectedDate={selectedDate} onDateChange={setSelectedDate} timezone={user?.timezone} />
                            <p id="availability-scroll-help" className="text-sm text-slate-600">Scroll the calendar horizontally on smaller screens. Select a time to toggle availability.</p>
                            <div className="calendar-scroll" role="region" aria-label="Edit tutor availability calendar" aria-describedby="availability-scroll-help" tabIndex={0}>
                            <div className="grid min-w-[34rem] grid-cols-8 gap-2">
                                <button 
                                    aria-label="Previous availability times" onClick={() => setCurrentTimePage(currentTimePage > 0 ? currentTimePage - 1 : 7)}
                                    className="flex min-h-11 items-center justify-center font-semibold text-center cursor-pointer"
                                >
                                    &lt;
                                </button>
                                <div className="flex min-h-11 items-center overflow-hidden col-span-6">
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
                                    className="flex min-h-11 items-center justify-center font-semibold text-center cursor-pointer"
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

                                                const isActive = availabilityTimeRanges.some(availability =>
                                                    availability.type === "weekly" &&
                                                    availability.dayOfTheWeek === dayIndex &&
                                                    availability.startTime <= timeIndex &&
                                                    availability.endTime >= timeIndex
                                                );

                                                const leftTimeIndex = timeIndex - 30;
                                                const rightTimeIndex = timeIndex + 30;

                                                const hasLeftNeighbor =
                                                    column > 0 &&
                                                    availabilityTimeRanges.some(availability =>
                                                        availability.type === "weekly" &&
                                                        availability.dayOfTheWeek === dayIndex &&
                                                        availability.startTime <= leftTimeIndex &&
                                                        availability.endTime >= leftTimeIndex
                                                    );

                                                const hasRightNeighbor =
                                                    column < 5 &&
                                                    availabilityTimeRanges.some(availability =>
                                                        availability.type === "weekly" &&
                                                        availability.dayOfTheWeek === dayIndex &&
                                                        availability.startTime <= rightTimeIndex &&
                                                        availability.endTime >= rightTimeIndex
                                                    );

                                                return (
                                                    <button
                                                        key={calendarIndex}
                                                        type="button"
                                                        aria-pressed={isActive}
                                                        aria-label={`${availabilityType === 'weekly' ? days[dayIndex] : ''} ${times[timeIndex / 30]}`}
                                                        className={`min-h-11 min-w-11 cursor-pointer ${getAvailabilityCalendarCellSize(isActive, hasLeftNeighbor, hasRightNeighbor)}`}
                                                        onClick={() => toggleSquare({
                                                            timeIndex,
                                                            dayIndex,
                                                            type: 'weekly'
                                                        })}
                                                    />
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

                                                const isActive = availabilityTimeRanges.some(availability =>
                                                    availability.type === "custom" &&
                                                    availability.date === formatToDateString(date) &&
                                                    availability.startTime <= timeIndex &&
                                                    availability.endTime >= timeIndex
                                                );

                                                const leftTimeIndex = timeIndex - 30;
                                                const rightTimeIndex = timeIndex + 30;

                                                const hasLeftNeighbor =
                                                    column > 0 &&
                                                    availabilityTimeRanges.some(availability =>
                                                        availability.type === "custom" &&
                                                        availability.date === formatToDateString(date) &&
                                                        availability.startTime <= leftTimeIndex &&
                                                        availability.endTime >= leftTimeIndex
                                                    );

                                                const hasRightNeighbor =
                                                    column < 5 &&
                                                    availabilityTimeRanges.some(availability =>
                                                        availability.type === "custom" &&
                                                        availability.date === formatToDateString(date) &&
                                                        availability.startTime <= rightTimeIndex &&
                                                        availability.endTime >= rightTimeIndex
                                                    );

                                                return (
                                                    <button
                                                        key={calendarIndex}
                                                        type="button"
                                                        aria-pressed={isActive}
                                                        aria-label={`${date.toLocaleDateString()} ${times[timeIndex / 30]}`}
                                                        className={`min-h-11 min-w-11 cursor-pointer ${getAvailabilityCalendarCellSize(isActive, hasLeftNeighbor, hasRightNeighbor)}`}
                                                        onClick={() => toggleSquare({
                                                            timeIndex,
                                                            date: formatToDateString(date),
                                                            type: 'custom'
                                                        })}
                                                    />
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
                <p>Tutor profile not found.</p>
            )}
        </div>
    );
}