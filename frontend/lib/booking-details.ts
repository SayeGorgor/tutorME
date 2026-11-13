import type { Booking } from "./types.ts";

// Decimal strings come from the server. No client pricing arithmetic.
export function moneyLabel(value: string | null | undefined, currency: string | null | undefined) {
  if (currency !== "USD" || value == null || !/^\d+(\.\d{1,2})?$/.test(value))
    return "Not recorded";

  const [whole, cents = ""] = value.split(".");

  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${cents.padEnd(2, "0")} USD`;
}

export function profileQuote(rate: number): string | null {
  const text = String(rate);

  return rate >= 0 && rate <= 10000 && /^\d+(\.\d{1,2})?$/.test(text) ? text : null;
}

export function canRequestSubject(subjects: { id: number }[], subject: string) {
  return subjects.some((item) => String(item.id) === subject);
}

export function bookingDetails(booking: Partial<Booking>) {
  const accepted = booking.status === "confirmed" || booking.status === "completed";

  return {
    heading:
      booking.status === "pending"
        ? "Requested session"
        : accepted
          ? "Confirmed session"
          : "Session details",
    subject: booking.subjectNameSnapshot || "Not recorded",
    rateLabel: accepted ? "Accepted rate" : "Quoted rate",
    rate: moneyLabel(booking.hourlyRateSnapshot, booking.currencySnapshot),
    amount: moneyLabel(booking.sessionAmountSnapshot, booking.currencySnapshot),
    duration:
      booking.durationMinutesSnapshot == null
        ? "Not recorded"
        : `${booking.durationMinutesSnapshot} minutes`,
  };
}
