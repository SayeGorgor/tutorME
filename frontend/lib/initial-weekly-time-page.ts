import type { Availability } from "./types";

export function getInitialWeeklyTimePage(availability: Availability[], pageCount: number): number {
  let earliestStartTime = Infinity;
  for (const record of availability) {
    if (record?.type === "weekly" && Number.isInteger(record.startTime)
      && record.startTime >= 0 && record.startTime < 24 * 60) {
      earliestStartTime = Math.min(earliestStartTime, record.startTime);
    }
  }
  if (!Number.isFinite(earliestStartTime)) return 0;
  return Math.max(0, Math.min(Math.floor(earliestStartTime / (6 * 30)), pageCount - 1));
}
