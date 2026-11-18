/**
 * Pure helpers that decide who gets which email on a given day. No I/O, so they are unit tested.
 * Dates are "YYYY-MM-DD" strings interpreted in UTC.
 */

export type TenantNotificationKind = "cycle_ready" | "due_soon" | "overdue";
export type NotificationKind = TenantNotificationKind | "owner_digest";

/** Days before the due date when the "due soon" reminder may go out (inclusive). */
export const DUE_SOON_WINDOW_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export function toUTCDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (both "YYYY-MM-DD"). Negative if `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / DAY_MS);
}

export interface ReminderCandidate {
  cycleId: string;
  propertyTenantId: string;
  cycleStatus: "draft" | "open" | "closed";
  dueDate: string | null;
  /** Sum of this tenant's splits in the cycle that are still 'owed' (not marked paid). */
  owedCents: number;
  /** Kinds already recorded in cycle_notifications for this tenant + cycle. */
  alreadySent: readonly NotificationKind[];
  /** profiles.email_reminders */
  remindersEnabled: boolean;
  hasEmail: boolean;
}

/**
 * Which reminder (if any) this tenant should get today.
 * - Nothing for draft cycles, cycles without a due date, opted-out tenants or nothing owed.
 * - "overdue" once the due date has passed (sent once).
 * - "due_soon" within DUE_SOON_WINDOW_DAYS of the due date (sent once; skipped once overdue).
 */
export function reminderKindFor(today: string, c: ReminderCandidate): "due_soon" | "overdue" | null {
  if (c.cycleStatus === "draft" || !c.dueDate) return null;
  if (!c.remindersEnabled || !c.hasEmail) return null;
  if (c.owedCents <= 0) return null;

  const daysLeft = daysBetween(today, c.dueDate);
  if (daysLeft < 0) {
    return c.alreadySent.includes("overdue") ? null : "overdue";
  }
  if (daysLeft <= DUE_SOON_WINDOW_DAYS) {
    return c.alreadySent.includes("due_soon") ? null : "due_soon";
  }
  return null;
}

export function planReminders(
  today: string,
  candidates: readonly ReminderCandidate[]
): { candidate: ReminderCandidate; kind: "due_soon" | "overdue" }[] {
  const plan: { candidate: ReminderCandidate; kind: "due_soon" | "overdue" }[] = [];
  for (const candidate of candidates) {
    const kind = reminderKindFor(today, candidate);
    if (kind) plan.push({ candidate, kind });
  }
  return plan;
}

/** Collapse split rows into one candidate per (cycle, tenant). Only 'owed' splits count as owed. */
export function groupOwedByTenantCycle(
  splits: readonly {
    cycleId: string;
    propertyTenantId: string;
    amountCents: number;
    paymentStatus: string;
  }[]
): Map<string, { cycleId: string; propertyTenantId: string; owedCents: number }> {
  const map = new Map<string, { cycleId: string; propertyTenantId: string; owedCents: number }>();
  for (const s of splits) {
    const key = `${s.cycleId}:${s.propertyTenantId}`;
    const entry = map.get(key) ?? { cycleId: s.cycleId, propertyTenantId: s.propertyTenantId, owedCents: 0 };
    if (s.paymentStatus === "owed") entry.owedCents += s.amountCents;
    map.set(key, entry);
  }
  return map;
}

export interface DigestSplit {
  ownerId: string;
  markedPaidAt: string | null;
  paymentStatus: string;
}

/**
 * Splits newly marked paid (still awaiting the owner's confirmation) since the owner's last digest.
 * With no previous digest, looks back `fallbackHours` from `now`.
 */
export function selectDigestItems<T extends DigestSplit>(
  splits: readonly T[],
  lastDigestAt: string | null,
  now: Date,
  fallbackHours = 24
): T[] {
  const since = lastDigestAt
    ? Date.parse(lastDigestAt)
    : now.getTime() - fallbackHours * 60 * 60 * 1000;
  return splits.filter(
    (s) =>
      s.paymentStatus === "marked_paid" &&
      s.markedPaidAt !== null &&
      Date.parse(s.markedPaidAt) > since
  );
}

export interface ShareLineInput {
  category: string;
  provider: string;
  billAmountCents: number;
  personDays: number;
  totalPersonDays: number;
  shareCents: number;
}

/** "$120.00 × 30 / 100 person-days" — the person-days math shown next to each share. */
export function describeShareMath(line: ShareLineInput, formatCents: (c: number) => string): string {
  return `${formatCents(line.billAmountCents)} × ${line.personDays} / ${line.totalPersonDays} person-days`;
}

export function totalShareCents(lines: readonly { shareCents: number }[]): number {
  return lines.reduce((sum, l) => sum + l.shareCents, 0);
}
