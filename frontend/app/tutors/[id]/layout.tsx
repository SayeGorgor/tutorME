import LandingNav from "@/components/LandingNav"

export default function LandingLayout({ 
    children 
}: { 
    children: React.ReactNode 
}) {
    return (
        <div>
            <LandingNav />
            <main>
                {children}
            </main>
        </div>
    )
}