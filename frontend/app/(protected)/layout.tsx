import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { UserProvider } from "@/lib/context/UserContext";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ 
    children 
}: { 
    children: React.ReactNode 
}) {
    const { data: sessionData } = await auth.getSession();
    if (!sessionData?.session || !sessionData?.user) {
        redirect("/");
    }

    return (
        <UserProvider>
            {children}
        </UserProvider>
    )
};