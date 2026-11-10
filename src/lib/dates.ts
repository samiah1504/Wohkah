/**
 * Business dates are interpreted in the company's time zone, not the server's
 * (servers run in UTC; Lagos is UTC+1).
 */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function formatDate(
  isoDate: string,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
) {
  // Plain dates (YYYY-MM-DD) are calendar dates: format them in UTC to avoid shifting.
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
}

export function formatDateTime(iso: string, timeZone: string) {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  });
}
