'use client';

import React from "react";
import { useState, useEffect } from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useCurrentUser } from "@/lib/context/UserContext";
import { getTutorByUserId, updateTutorProfile } from "@/lib/api/actions/client-actions";
import { TutorProfile } from "@/lib/types";

import RatingStar from "@/components/RatingStar";
import EditIcon from "@/public/icons/edit_icon.svg";
import LoadingAnimationIcon from "@/public/icons/loading_animation_icon.svg";
import { AVAILABILITY_TIMES } from "@/constants/constants";

export default function ProfilePage() {
    const { user, loading } = useCurrentUser();
    const router = useRouter();

    const times = AVAILABILITY_TIMES;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const [tutorProfile, setTutorProfile] = useState<TutorProfile | null>(null);
    const [isEditingIntro, setIsEditingIntro] = useState(false);
    const [introText, setIntroText] = useState("");
    const [isEditingAbout, setIsEditingAbout] = useState(false);
    const [aboutText, setAboutText] = useState("");
    const [isEditingSubjects, setIsEditingSubjects] = useState(false);
    const [activeSquares, setActiveSquares] = useState<Set<number>>(new Set());

    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [systemMessage, setSystemMessage] = useState("");

    const [currentTimePage, setCurrentTimePage] = useState(0);
    const timePages = Array.from(
        {length: Math.ceil(times.length / 6)},
        (_, i) => times.slice(
            i * 6,
            i * 6 + 6
        )
    );

    useEffect(() => {
        const fetchTutorProfile = async () => {
            if (user) {
                setIsLoading(true);
                const res = await getTutorByUserId(user.id);
                console.log('Tutor Profile: ', res);
                setTutorProfile(res);
                setIntroText(res.intro);
                setAboutText(res.bio);
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

    const toggleSquare = (id: number) => {
        setActiveSquares((prev) => {
            const next = new Set(prev);

            if(next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        })
    }

    const getCellSize = (index: number, column: number) => {
        const isActive = activeSquares.has(index);

        if(!isActive) return "rounded-2xl border border-black"

        const hasLeftNeighbor = column > 0 && activeSquares.has(index - 1);
        const hasRightNeighbor = activeSquares.has(index + 1);

        return `
            bg-blue-500
            ${hasLeftNeighbor ? "-ml-2 pl-2 rounded-l-none border-l-0" : "rounded-l-2xl"}
            ${hasRightNeighbor ? "-mr-2 pr-2 rounded-r-none border-r-0" : "rounded-r-2xl"}
            border border-black
        `
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
                                            onClick={() => setIsEditingIntro(!isEditingIntro)}
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
                                        onClick={() => setIsEditingAbout(!isEditingAbout)}
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
                        <div id="additional-info-section-right" className="flex flex-3 flex-col gap-1 ml-10">
                            <h3 className="text-xl font-bold">Availability - <span className="text-lg">{currentTimePage > 3 ? 'PM' : 'AM'}</span></h3>
                            <div className="grid grid-cols-8 gap-2">
                                <button 
                                    onClick={() => setCurrentTimePage(currentTimePage > 0 ? currentTimePage - 1 : 7)}
                                    className="flex items-center justify-center font-semibold h-6 text-center cursor-pointer"
                                >
                                    &lt;
                                </button>
                                <div className="overflow-hidden col-span-6">
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

                                {days.map((day, dayIndex) => (
                                    <React.Fragment key={day}>
                                        <div className="flex items-center justify-center font-semibold h-10 text-center">{day}</div>
                                        {Array.from({ length: 6 }).map((_, column) => {
                                            const index = dayIndex * 6 + column;

                                            return (
                                                <div
                                                    key={index}
                                                    className={`h-10 cursor-pointer ${getCellSize(index, column)}`}
                                                    onClick={() => toggleSquare(index)}
                                                ></div>
                                            );
                                        })}
                                        <div className="h-10"></div>
                                    </React.Fragment>
                                ))}
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