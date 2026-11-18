const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(date: string): { y: number; m: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1 };
}

/**
 * Suggest a cycle label from UTC "YYYY-MM-DD" dates:
 * same month → "Dec 2026"; same year → "Nov – Dec 2026"; across years → "Dec 2026 – Jan 2027".
 * Returns "" when the dates are missing, invalid or reversed.
 */
export function suggestCycleLabel(start: string, end: string): string {
  const a = parts(start);
  const b = parts(end);
  if (!a || !b) return "";
  if (a.y > b.y || (a.y === b.y && a.m > b.m)) return "";
  if (a.y === b.y && a.m === b.m) return `${MONTHS[a.m]} ${a.y}`;
  if (a.y === b.y) return `${MONTHS[a.m]} – ${MONTHS[b.m]} ${a.y}`;
  return `${MONTHS[a.m]} ${a.y} – ${MONTHS[b.m]} ${b.y}`;
}

/** Default dates for a new cycle: the calendar month after `latestEnd` (or the current UTC month). */
export function nextCycleDates(
  latestEnd: string | null,
  today: Date = new Date()
): { start: string; end: string } {
  let y: number;
  let m: number;
  const p = latestEnd ? parts(latestEnd) : null;
  if (p) {
    y = p.m === 11 ? p.y + 1 : p.y;
    m = (p.m + 1) % 12;
  } else {
    y = today.getUTCFullYear();
    m = today.getUTCMonth();
  }
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const mm = String(m + 1).padStart(2, "0");
  return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}
