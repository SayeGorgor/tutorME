'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTutorByUserId } from "@/lib/api/actions/client-actions";
import type { TutorProfile } from "@/lib/types";
import Image from "next/image";
import RatingStar from "@/components/RatingStar";
import Link from "next/dist/client/link";

export default function TutorProfilePage({ 
    params, 
} : {
    params: Promise<{ id: number }>;
}) {
    const router = useRouter();
    
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [tutorProfile, setTutorProfile] = useState<TutorProfile | null>(null);
    const [id, setId] = useState<number | null>(null);
    
    useEffect(() => {
        const fetchTutorProfile = async () => {
            const { id } = await params;
            setIsLoading(true);
            try {
                const tutorProfileData = await getTutorByUserId(id);
                setTutorProfile(tutorProfileData);
            } catch (error) {
                console.error("Error fetching tutor profile:", error);
            } finally {
                setIsLoading(false);
            }
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

                            <button className="mt-4 bg-blue-700 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-300">
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
                        <div id="additional-info-section-left" className="flex flex-col gap-5">
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
                        <div id="additional-info-section-right" className="flex flex-col gap-5 ml-10">
                            {/* Additional right-side content can go here */}
                        </div>
                    </div>
                </>
            ) : (
                <p>Tutor profile not found.</p>
            )}
        </div>
    )
}