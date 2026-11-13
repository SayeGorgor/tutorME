export type BookingNoticeTone = "info" | "success" | "warning" | "error";

const tones = {
  info: {
    title: "Booking update",
    classes: "border-blue-500 bg-[#eff6ff] text-blue-950 dark:bg-blue-950 dark:text-blue-100",
    icon: "i",
  },
  success: {
    title: "Success",
    classes:
      "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100",
    icon: "✓",
  },
  warning: {
    title: "Please note",
    classes: "border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
    icon: "!",
  },
  error: {
    title: "Action needed",
    classes: "border-red-500 bg-red-50 text-red-950 dark:bg-red-950 dark:text-red-100",
    icon: "!",
  },
};

export default function BookingNotice({
  message,
  tone = "info",
  title,
}: {
  message: string;
  tone?: BookingNoticeTone;
  title?: string;
}) {
  if (!message) return null;

  const style = tones[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-atomic="true"
      className={`flex items-start gap-3 rounded-xl border border-l-4 p-4 shadow-sm ${style.classes}`}
    >
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full border border-current/20 text-base font-bold"
      >
        {style.icon}
      </span>
      <div className="min-w-0">
        <p className="font-semibold">{title || style.title}</p>
        <p className="mt-1 text-sm leading-6">{message}</p>
      </div>
    </div>
  );
}
