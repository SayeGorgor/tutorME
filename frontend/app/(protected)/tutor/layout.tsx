import ProtectedTutorNav from "@/components/ProtectedTutorNav";

export default function TutorLayout({ 
    children 
}: { 
    children: React.ReactNode 
}) {
    return (
        <div className="flex min-h-screen max-w-screen bg-blue-50">
            <ProtectedTutorNav />
            <main className="flex min-h-screen flex-1">
                {children}
            </main>
        </div>
    )
};