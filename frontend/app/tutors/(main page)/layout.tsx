import LandingNav from "@/components/LandingNav"

export default function LandingLayout({ 
    children 
}: { 
    children: React.ReactNode 
}) {
    return (
        <div className="flex h-screen flex-col">
            <LandingNav />
            <main className="min-h-0 flex-1">
                {children}
            </main>
        </div>
    )
}