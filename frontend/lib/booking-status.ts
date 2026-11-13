import type { Booking } from "./types";

export function bookingDisplayStatus(
  booking: Pick<Booking, "status" | "startsAt">,
  now: number,
): Booking["status"] {
  return booking.status === "pending" && new Date(booking.startsAt).getTime() <= now
    ? "expired"
    : booking.status;
}
