import LandingNav from "@/components/LandingNav";
import { Suspense } from "react";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh min-w-0 flex-col">
      <LandingNav />
      <main className="flex min-w-0 flex-1 flex-col">
        <Suspense
          fallback={
            <p className="p-6" role="status">
              Loading tutors...
            </p>
          }
        >
          {children}
        </Suspense>
      </main>
    </div>
  );
}
