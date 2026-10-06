import ProtectedTutorNav from "@/components/ProtectedTutorNav";

export default function TutorLayout({ 
    children 
}: { 
    children: React.ReactNode 
}) {
    return (
        <div className="flex min-h-dvh w-full min-w-0 flex-col bg-blue-50 lg:flex-row">
            <div className="w-full shrink-0 lg:w-1/6 lg:min-w-52">
                <ProtectedTutorNav />
            </div>
            <main className="flex min-w-0 flex-1">
                {children}
            </main>
        </div>
    )
};