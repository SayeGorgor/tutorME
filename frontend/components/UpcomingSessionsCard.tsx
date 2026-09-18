'use client';

import Image from "next/image";

export default function UpcomingSessionsCard() {
    return (
        <div className="flex justify-between bg-white w-200 p-4 rounded-lg shadow-sm">
            <div className="flex gap-4">
                <Image 
                    src="/icons/default_pfp_icon.svg" 
                    alt="Tutor's profile picture" 
                    width={125} 
                    height={125} 
                    className="bg-gray-500 rounded-lg"
                />

                <div className="flex flex-col justify-between">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-black text-xl font-semibold">Huey Huynh</h3>
                        <p className="text-gray-600">Mathematics • Online</p>
                    </div>

                    <p className="text-black font-bolder">Friday, Sep 18 • 2:22 PM</p>
                </div>
            </div>

            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 cursor-pointer">
                Join Session
            </button>
        </div>
    );
}