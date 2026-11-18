// Pure helpers for founding / comped plans. Dates are "YYYY-MM-DD" strings in UTC.

/** Sentinel stored in user_subscriptions.comp_until for "comped with no end date". */
export const COMP_FOREVER = "9999-12-31";

export const COMP_PRESETS = ["6m", "1y", "forever", "date", "clear"] as const;
export type CompPreset = (typeof COMP_PRESETS)[number];

export const COMP_PRESET_LABELS: Record<CompPreset, string> = {
  "6m": "+6 months",
  "1y": "+1 year",
  forever: "No end date",
  date: "Pick a date",
  clear: "End comp (bill normally)",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function todayUTC(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Add whole months to a YYYY-MM-DD date, clamping to the last day of the target month. */
export function addMonthsISO(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const totalMonths = y * 12 + (m - 1) + months;
  const ty = Math.floor(totalMonths / 12);
  const tm = totalMonths % 12;
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  return `${String(ty).padStart(4, "0")}-${String(tm + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isCompForever(compUntil: string | null | undefined): boolean {
  return compUntil === COMP_FOREVER;
}

export function isCompActive(compUntil: string | null | undefined, today: string = todayUTC()): boolean {
  return !!compUntil && compUntil >= today;
}

/**
 * Work out the new comp_until for a preset.
 * Extensions stack on the current end date when it is still in the future,
 * otherwise they start from today.
 */
export function computeCompUntil(
  preset: CompPreset,
  current: string | null | undefined,
  today: string = todayUTC(),
  pickedDate?: string | null
): { value: string | null } | { error: string } {
  switch (preset) {
    case "clear":
      return { value: null };
    case "forever":
      return { value: COMP_FOREVER };
    case "date": {
      if (!pickedDate || !isIsoDate(pickedDate)) return { error: "Pick a valid date" };
      if (pickedDate < today) return { error: "The date can't be in the past" };
      return { value: pickedDate };
    }
    case "6m":
    case "1y": {
      if (isCompForever(current)) return { error: "This plan already has no end date" };
      const base = current && current >= today ? current : today;
      return { value: addMonthsISO(base, preset === "6m" ? 6 : 12) };
    }
  }
}

export type CompStatus =
  | { kind: "none" }
  | { kind: "forever" }
  | { kind: "active"; until: string }
  | { kind: "expired"; until: string };

export function getCompStatus(compUntil: string | null | undefined, today: string = todayUTC()): CompStatus {
  if (!compUntil) return { kind: "none" };
  if (isCompForever(compUntil)) return { kind: "forever" };
  return compUntil >= today ? { kind: "active", until: compUntil } : { kind: "expired", until: compUntil };
}
