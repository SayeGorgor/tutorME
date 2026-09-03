'use client';

import { useState, useEffect } from 'react';
import { getTutorDistance } from '../lib/api/actions/client-actions';
import { TutorCardProps } from '../lib/types';
import Image from 'next/image';

export default function TutorCard({ 
    id, 
    firstName, 
    lastName, 
    description, 
    subject, 
    pfp, 
    location, 
    languages 
}: TutorCardProps) {
    const [distance, setDistance] = useState<number | null>(null);
    
    // useEffect(() => {
    //     const fetchDistance = async () => {
    //         if (location) {
    //             const distance = await getTutorDistance(0, 0, location.latitude, location.longitude);
    //             setDistance(distance);
    //         }
    //     };
    //     fetchDistance();
    // }, []);

    return (
        <div className="flex gap-5 h-48 bg-white p-4 rounded-lg shadow-md">
            <Image 
                id="pfp" 
                src="/icons/default_pfp_icon.svg" 
                alt={`${firstName} ${lastName}`} 
                width={150} 
                height={100}
                className="bg-gray-500 rounded-lg"
            />
            <div id="info">
                <h2 className='text-xl font-bold'>{firstName} {lastName}</h2>
                <p>{description}</p>
                <p>Subject: {subject}</p>
                {pfp && <img src={pfp} alt={`${firstName} ${lastName}`} />}
                {location && (
                    <p>Location: {location.city}, {location.state}</p>
                )}
                {languages && languages.length > 0 && (
                    <p>Languages: {languages.map(lang => lang.name).join(', ')}</p>
                )}
            </div>
        </div>
    );
}