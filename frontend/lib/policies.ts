export type PolicyInfo = {
  ready: boolean; operatorName: string | null; contactEmail: string | null; effectiveDate: string | null;
  termsVersion: string; bookingsEnabled: boolean; minorProfilesEnabled: boolean;
};
export const unavailablePolicies: PolicyInfo = { ready: false, operatorName: null, contactEmail: null, effectiveDate: null, termsVersion: "", bookingsEnabled: false, minorProfilesEnabled: false };
export async function loadPolicyInfo(): Promise<PolicyInfo> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/policies`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    return response.ok ? await response.json() : unavailablePolicies;
  } catch { return unavailablePolicies; }
}
