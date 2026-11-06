import { authorized } from "./authorized";
import type { CompleteRegistrationInput, RegistrationStatus, User } from "@/lib/types";
export const getRegistrationStatus = () => authorized<RegistrationStatus>("/api/users/registration-status");
export const finishRegistration = (data: CompleteRegistrationInput) => authorized<User>("/api/users/complete-registration", "POST", data);
