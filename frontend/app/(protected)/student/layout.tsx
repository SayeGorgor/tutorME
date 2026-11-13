import ProtectedStudentNav from "@/components/ProtectedStudentNav";
import AccountBoundary from "@/components/AccountBoundary";

export default function StudentLayout({ 
    children 
}: { 
    children: React.ReactNode 
}) {
    return (
        <div className="flex min-h-dvh min-w-0 flex-col bg-blue-50 lg:flex-row">
            <div className="w-full shrink-0 lg:w-1/6 lg:min-w-52"><ProtectedStudentNav /></div>
            <main className="account-content min-w-0 flex-1">
                <AccountBoundary>{children}</AccountBoundary>
            </main>
        </div>
    )
};
