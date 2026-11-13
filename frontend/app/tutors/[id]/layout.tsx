import LandingNav from "@/components/LandingNav";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh min-w-0 flex-col">
      <LandingNav />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
