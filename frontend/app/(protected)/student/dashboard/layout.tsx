import ProtectedStudentNav from "../../../../components/ProtectedStudentNav";

export default function StudentLayout({ 
    children 
}: { 
    children: React.ReactNode 
}) {
    return (
        <div className="flex min-h-screen bg-blue-50">
            <ProtectedStudentNav />
            <main>
                {children}
            </main>
        </div>
    )
};