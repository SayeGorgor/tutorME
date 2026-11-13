import type { CompleteRegistrationInput } from "../types";

const fullName = (first: string, last: string) => `${first} ${last}`.trim().split(/\s+/).join(" ");

export function completionPlan(
  name: string,
  draft: CompleteRegistrationInput | null,
  termsVersion: string,
) {
  const registeredName = name.trim().split(/\s+/).join(" ");
  const saved =
    draft && fullName(draft.firstName, draft.lastName) === registeredName ? draft : null;
  const [firstName, ...remaining] = registeredName.split(" ");

  return {
    firstName: saved?.firstName || firstName,
    lastName: saved?.lastName ?? remaining.join(" "),
    role: saved?.role || null,
    accountPurpose: saved?.accountPurpose || null,
    timezone: saved?.timezone || null,
    acceptanceCurrent:
      !!saved &&
      saved.adultConfirmed === true &&
      saved.termsAccepted === true &&
      saved.termsVersion === termsVersion,
  };
}
