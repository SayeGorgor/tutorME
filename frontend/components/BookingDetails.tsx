import type { Booking } from "@/lib/types";
import { bookingDetails } from "@/lib/booking-details";

export default function BookingDetails({ booking }: { booking: Partial<Booking> }) {
  const details = bookingDetails(booking);
  return <div className="mt-3 rounded-xl border border-slate-200 p-4 text-sm">
    <h4 className="font-semibold">{details.heading}</h4>
    <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {[["Subject", details.subject], ["Duration", details.duration], [details.rateLabel, details.rate], ["Session amount", details.amount]].map(([label, value]) =>
        <div key={label}><dt className="text-slate-600">{label}</dt><dd className="break-words font-medium">{value}</dd></div>)}
    </dl>
  </div>;
}
