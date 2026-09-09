import LandingNav from "@/components/LandingNav"

export default function LandingLayout({ 
    children 
}: { 
    children: React.ReactNode 
}) {
    return (
        <div className="flex h-screen flex-col">
            <LandingNav />
            <div className="min-h-0 flex-1">
                {children}
            </div>
        </div>
    )
}