'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTutorByUserId } from "@/lib/api/actions/client-actions";
import type { TutorProfile } from "@/lib/types";
import Image from "next/image";
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
                <div 
                    id="tutor-profile-card" 
                    className="flex justify-between p-4 bg-blue-100 rounded-lg"
                >
                    <div 
                        id="tutor-profile-card-left"
                        className="flex gap-4"
                    >
                        <Image 
                            id="pfp" 
                            src="/icons/default_pfp_icon.svg" 
                            alt={`${tutorProfile.user.firstName} ${tutorProfile.user.lastName}'s Profile Picture`} 
                            width={210} 
                            height={140}
                            className="bg-gray-500 rounded-lg"
                        />
                        <div
                            id="tutor-info"
                            className="flex flex-col"
                        >
                            <p className="font-bold text-2xl">{tutorProfile.user.firstName} {tutorProfile.user.lastName}</p>
                            <p className="w-150">{tutorProfile.intro}</p>
                        </div>
                    </div>
                    <div id="tutor-profile-card-right" className="flex flex-col">
                        <p><span className="font-bold text-xl">${tutorProfile.price}</span> /hr</p>
                    </div>
                </div>
            ) : (
                <p>Tutor profile not found.</p>
            )}
        </div>
    )
}