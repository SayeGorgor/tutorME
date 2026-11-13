import { auth } from "@/lib/auth/server";
import LandingContent from "./LandingContent";
import HomepageAccountGate from "@/components/HomepageAccountGate";

export const dynamic = "force-dynamic";

export default async function Home() {
  let result;
  try {
    result = await auth.getSession();
  } catch {
    return <HomepageAccountGate sessionError />;
  }
  if (result.error) return <HomepageAccountGate sessionError />;
  if (result.data?.session && result.data?.user) return <HomepageAccountGate />;
  return <LandingContent />;
}
