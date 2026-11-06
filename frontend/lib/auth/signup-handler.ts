// Reject known duplicates before the hosted provider can send signup mail.
export function createSignupHandler<Args extends [Request, ...unknown[]]>(
  provider: (...args: Args) => Promise<Response>,
  checkRegistration: (body: Record<string, unknown>) => Promise<Response>,
  afterSignup?: (body: Record<string, unknown>, response: Response, request: Request) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    const request = args[0];
    let signupBody: Record<string, unknown> | undefined;
    if (new URL(request.url).pathname.replace(/\/$/, "").endsWith("/sign-up/email")) {
      try {
        const body = await request.clone().json();
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          return Response.json({ message: "Invalid signup request." }, { status: 400 });
        }
        const check = await checkRegistration(body);
        if (!check.ok) {
          if (check.status === 409) return Response.json({ code: "ACCOUNT_ALREADY_EXISTS", message: "An account already uses this email. Sign in, or verify your email and finish account setup." }, { status: 409 });
          return Response.json({ message: "Registration could not be approved. Check your email, adult eligibility and current Terms acceptance, or try again later." }, { status: check.status });
        }
        signupBody = body;
      } catch {
        return Response.json({ message: "Registration could not be checked. Please try again later." }, { status: 503 });
      }
    }
    // Preserve the provider's original request, cookies, origin and CSRF handling.
    const response = await provider(...args);
    return signupBody && response.ok && afterSignup ? afterSignup(signupBody, response, request) : response;
  };
}
