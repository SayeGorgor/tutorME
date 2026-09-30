'use client';

import UpcomingSessionsCard from "@/components/UpcomingSessionsCard";
import { useCurrentUser } from "@/lib/context/UserContext";

import LoadingAnimation from "@/public/icons/loading_animation_icon.svg";

export default function DashboardPage() {
    const { user, loading } = useCurrentUser();

    if (loading) {
        return <LoadingAnimation className="self-center mx-auto justify-self-center w-10 h-10" />;
    }

    return (
        <div className="flex flex-col gap-6 px-10 py-6">
            <div>
                <h1 className="text-2xl font-bold">Good afternoon, {user?.firstName}!</h1>
                <p className="text-gray-600">Here's what's coming up in your learning schedule.</p>
            </div>

            <div className="flex flex-col gap-2 mt-4">
                <h2 className="text-xl font-semibold">Upcoming Sessions</h2>
                <UpcomingSessionsCard />
            </div>
            
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">Your Learning</h2>
                
                <div className="flex gap-4">
                    <div className="bg-white w-50 px-4 py-6 rounded-lg shadow-sm">
                        <h3 className="text-blue-500 text-3xl font-semibold">0</h3>
                        <p className="text-gray-600">Sessions This Month</p>
                    </div>

                    <div className="bg-white w-50 px-4 py-6 rounded-lg shadow-sm">
                        <h3 className="text-blue-500 text-3xl font-semibold">$0</h3>
                        <p className="text-gray-600">Earnings This Month</p>
                    </div>

                    <div className="bg-white w-50 px-4 py-6 rounded-lg shadow-sm">
                        <h3 className="text-blue-500 text-3xl font-semibold">N/A</h3>
                        <p className="text-gray-600">Average Rating</p>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold">Recommended for you</h2>
                <p className="text-gray-600">You have no upcoming sessions scheduled.</p>
            </div>
        </div>
    )
}