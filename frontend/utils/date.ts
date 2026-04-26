/**
 * Format a Date as a local-timezone YYYY-MM-DD string.
 *
 * Unlike `d.toISOString().split('T')[0]` (which converts to UTC first),
 * this uses the Date's local components — so a Monday 10 PM in PDT stays
 * `2026-04-20`, not `2026-04-21` like the UTC conversion would yield.
 */
export function toLocalDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Return the Monday of the week containing `d` as a local YYYY-MM-DD string.
 */
export function mondayOf(d: Date): string {
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return toLocalDateStr(monday);
}
