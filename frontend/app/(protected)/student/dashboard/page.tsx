import UpcomingSessionsCard from "@/components/UpcomingSessionsCard";

export default function DashboardPage() {
    return (
        <div className="flex flex-col gap-6 px-10 py-6">
            <div>
                <h1 className="text-2xl font-bold">Good afternoon, Student!</h1>
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
                        <p className="text-gray-600">Sessions Completed</p>
                    </div>

                    <div className="bg-white w-50 px-4 py-6 rounded-lg shadow-sm">
                        <h3 className="text-blue-500 text-3xl font-semibold">0h</h3>
                        <p className="text-gray-600">Learning Time</p>
                    </div>

                    <div className="bg-white w-50 px-4 py-6 rounded-lg shadow-sm">
                        <h3 className="text-blue-500 text-3xl font-semibold">0</h3>
                        <p className="text-gray-600">Tutors Worked With</p>
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