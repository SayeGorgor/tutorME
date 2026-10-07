'use client';

import React from "react";
import { useState, useEffect, useRef } from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

import RatingStar from "@/components/RatingStar";
import ChoiceArrowsIcon from "@/public/icons/choice_arrows_icon.svg";
import CalendarIcon from "@/public/icons/calendar_icon.svg";
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
    const { user, loading } = useCurrentUser();
    const router = useRouter();

    const times = AVAILABILITY_TIMES;
    const days = DAYS;

    const dateInputRef = useRef<HTMLInputElement>(null);

    const [tutorProfile, setTutorProfile] = useState<TutorProfile | null>(null);
    const [isEditingIntro, setIsEditingIntro] = useState(false);
    const [introText, setIntroText] = useState("");
    const [isEditingAbout, setIsEditingAbout] = useState(false);
    const [aboutText, setAboutText] = useState("");
    const [isEditingSubjects, setIsEditingSubjects] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [systemMessage, setSystemMessage] = useState("");

    const [isLoadingAvailabilityUpdate, setIsLoadingAvailabilityUpdate] = useState(false);
    const [availabilityUpdateMessage, setAvailabilityUpdateMessage] = useState("");

    const [availabilityTimeRanges, setAvailabilityTimeRanges] = useState<AvailabilityTimeRange[]>([]);
    const [originalAvailabilityTimeRanges, setOriginalAvailabilityTimeRanges] = useState<AvailabilityTimeRange[]>([]);
    const [availabilityType, setAvailabilityType] = useState<"weekly" | "custom">("weekly");
    const [showAvailabilityTypeDropdown, setShowAvailabilityTypeDropdown] = useState(false);
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
        <div className="flex flex-1 flex-col gap-6 px-10 py-6 h-full w-full">
            {isLoading ? (
                <div className="h-full w-full flex justify-center items-center">
                    <LoadingAnimationIcon className="h-10 w-10" />
                </div>
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

                                    <p className="text-sm">Online Available</p>
                                </div>
                                
                                {isEditingIntro ? (
                                    <form className="flex gap-1" onSubmit={saveIntroChange}>
                                        <textarea
                                            value={introText}
                                            onChange={(e) => setIntroText(e.target.value)}
                                            className="w-150 h-15 p-2 border rounded-lg bg-white"
                                        />
                                        <div className="flex flex-col items-start justify-center">
                                            <button 
                                                type="submit"
                                                className="text-green-800 cursor-pointer hover:underline"
                                            >
                                                Save
                                            </button>
                                            <button 
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
                                    <div className="w-fit relative">
                                        <p className="max-w-150">{tutorProfile.intro}</p>
                                        <button 
                                            className="absolute top-[-14] right-[-24] rounded-full p-1 text-gray-600 hover:text-gray-800 cursor-pointer"
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
                            <p className="text-lg self-end text-gray-600"><span className="font-bold text-2xl text-black">${tutorProfile.price}</span> / hr</p>
                        </div>
                    </div>

                    <div id="additional-info-section" className="flex gap-4mt-4">
                        <div id="additional-info-section-left" className="flex flex-5 flex-col gap-5">
                            <div className="flex flex-col gap-1">
                                <div className="w-fit relative">
                                    <p className="text-xl font-bold">About {tutorProfile.user.firstName}</p>
                                    <button 
                                        className="absolute top-[-14] right-[-24] p-1 text-gray-600 hover:text-gray-800 cursor-pointer"
                                        onClick={() => {
                                            setIsEditingAbout(!isEditingAbout)
                                            setAboutText(tutorProfile.bio);
                                        }}
                                    >
                                        <EditIcon 
                                            className="w-4 h-4" 
                                        />
                                    </button>
                                </div>
                                {isEditingAbout ? (
                                    <form onSubmit={saveAboutChange} className="flex flex-col gap-2">
                                        <textarea 
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
                                    <p className="w-full whitespace-pre-line text-sm">{tutorProfile?.bio}</p>
                                )}
                            </div>

                            <div className="flex flex-col gap-1">
                                <div className="w-fit relative">
                                    <p className="text-xl font-bold">Subjects</p>
                                    <button 
                                        className="absolute top-[-14] right-[-24] p-1 text-gray-600 hover:text-gray-800 cursor-pointer"
                                        onClick={() => setIsEditingIntro(!isEditingIntro)}
                                    >
                                        <EditIcon 
                                            className="w-4 h-4" 
                                        />
                                    </button>
                                </div>
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
                            <div className="flex justify-between">
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
                                                    <div
                                                        key={calendarIndex}
                                                        className={`h-10 cursor-pointer ${getAvailabilityCalendarCellSize(isActive, hasLeftNeighbor, hasRightNeighbor)}`}
                                                        onClick={() => toggleSquare({
                                                            timeIndex,
                                                            dayIndex,
                                                            type: 'weekly'
                                                        })}
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
                                                    <div
                                                        key={calendarIndex}
                                                        className={`h-10 cursor-pointer ${getAvailabilityCalendarCellSize(isActive, hasLeftNeighbor, hasRightNeighbor)}`}
                                                        onClick={() => toggleSquare({
                                                            timeIndex,
                                                            date: formatToDateString(date),
                                                            type: 'custom'
                                                        })}
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
    );
}