'use client';

import { useState, useEffect } from 'react';
import { getTutorDistance } from '../lib/api/actions/client-actions';
import { TutorCardProps } from '../lib/types';

import Image from 'next/image';
import Link from 'next/link';

import RatingStar from './RatingStar';

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
    const [distance, setDistance] = useState<number | null>(2.4136);
    
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
            <div id="info" className="flex flex-1 justify-between">
                <div id='info-left' className="flex flex-col justify-between">
                    <h2 className='text-xl font-bold'>{firstName} {lastName}</h2>
                    <p className='text-gray-600'>Calculus • SAT Prep</p>
                    <div className="flex items-center gap-1">
                        <RatingStar filled={true} />
                        <span className="text-md text-black">4.5</span>
                        <span className="text-md text-black">(124)</span>
                    </div>
                    {pfp && <img src={pfp} alt={`${firstName} ${lastName}`} />}
                    {languages && languages.length > 0 && (
                        <p>Languages: {languages.map(lang => lang.name).join(', ')}</p>
                    )}
                    {distance !== null && (
                        <p className="text-sm text-gray-600">
                            {distance.toFixed(2)} mi • {location?.city}, {location?.state}
                        </p>
                    )}
                    <div 
                        id="session-type-badge"
                        className="inline-block w-fit px-2 py-1 text-sm font-semibold text-blue-600 bg-blue-100 rounded-full"
                    >
                        Online + Local
                    </div>
                </div>
                <div id='info-right' className="flex flex-col justify-between items-end">
                    <p className='text-black font-bold'>$ 35 / hr</p>
                    <Link href={`/`} className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 cursor-pointer text-center">
                        View Profile
                    </Link>
                </div>
            </div>
        </div>
    );
}