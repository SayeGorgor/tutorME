/** Compact display only; subject badges and selection keep the complete list. */
export function subjectSummary(subjects: readonly { name: string }[]): string {
  if (!subjects.length) return "Subjects not listed yet";
  const names = subjects.slice(0, 3).map(subject => subject.name).join(" / ");
  return subjects.length > 3 ? `${names} +${subjects.length - 3}` : names;
}
