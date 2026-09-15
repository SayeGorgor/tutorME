import ProtectedStudentNav from "../../../../components/ProtectedStudentNav";

export default function ProtectedLayout({ 
    children 
}: { 
    children: React.ReactNode 
}) {
    return (
        <div className="flex min-h-screen">
            <ProtectedStudentNav />
            <main>
                {children}
            </main>
        </div>
    )
};