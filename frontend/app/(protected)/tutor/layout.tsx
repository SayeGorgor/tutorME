import ProtectedTutorNav from "@/components/ProtectedTutorNav";

export default function TutorLayout({ 
    children 
}: { 
    children: React.ReactNode 
}) {
    return (
        <div className="flex min-h-screen bg-blue-50">
            <ProtectedTutorNav />
            <main>
                {children}
            </main>
        </div>
    )
};