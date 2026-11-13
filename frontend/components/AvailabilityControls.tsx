type Props = {
  type: "weekly" | "custom";
  onTypeChange: (type: "weekly" | "custom") => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  timezone?: string;
};

/** Native controls stay keyboard/touch accessible without an off-screen popover. */
export default function AvailabilityControls({
  type,
  onTypeChange,
  selectedDate,
  onDateChange,
  timezone,
}: Props) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
        Schedule type
        <select
          className="w-full border bg-white p-2"
          value={type}
          onChange={(event) => onTypeChange(event.target.value as Props["type"])}
        >
          <option value="weekly">Weekly</option>
          <option value="custom">Custom dates</option>
        </select>
      </label>
      {type === "custom" && (
        <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
          Week containing
          <input
            className="w-full border bg-white p-2"
            type="date"
            value={selectedDate.slice(0, 10)}
            onChange={(event) => {
              if (event.target.value) onDateChange(event.target.value);
            }}
          />
        </label>
      )}
      {timezone && (
        <p className="w-full text-sm text-slate-600 sm:col-span-2">
          Schedule time zone: {timezone}
        </p>
      )}
    </div>
  );
}
