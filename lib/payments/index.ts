/**
 * Pure payment helpers (no I/O). FairSplit never moves money; these build deep links into
 * the payment apps and derive the status shown to owners and tenants.
 */

import type { OwnerPaymentMethods, PaymentStatus } from "@/lib/supabase/types";

export type { OwnerPaymentMethods, PaymentStatus };
export type DisplayPaymentStatus = PaymentStatus | "overdue";

type SplitLike = { amount_cents: number; payment_status?: PaymentStatus | string | null };

export type PaymentSummary = {
  totalCents: number;
  owedCents: number;
  markedPaidCents: number;
  confirmedCents: number;
  /** Rolled-up status: confirmed only when everything is confirmed; owed if anything is owed. */
  status: PaymentStatus;
  splitCount: number;
};

/** Roll up a tenant's splits in a cycle (or across cycles) into one status + amounts. */
export function summarizeSplits(splits: SplitLike[]): PaymentSummary {
  let owed = 0;
  let marked = 0;
  let confirmed = 0;
  for (const s of splits) {
    const status = s.payment_status ?? "owed";
    if (status === "confirmed") confirmed += s.amount_cents;
    else if (status === "marked_paid") marked += s.amount_cents;
    else owed += s.amount_cents;
  }
  const hasOwed = splits.some((s) => (s.payment_status ?? "owed") === "owed");
  const hasMarked = splits.some((s) => s.payment_status === "marked_paid");
  const status: PaymentStatus =
    splits.length === 0 ? "confirmed" : hasOwed ? "owed" : hasMarked ? "marked_paid" : "confirmed";
  return {
    totalCents: owed + marked + confirmed,
    owedCents: owed,
    markedPaidCents: marked,
    confirmedCents: confirmed,
    status,
    splitCount: splits.length,
  };
}

/** Today's date as YYYY-MM-DD in UTC. */
export function todayUTC(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** "owed" past the due date (strictly after it, in UTC) is shown as overdue. */
export function displayStatus(
  status: PaymentStatus,
  dueDate: string | null | undefined,
  today: string = todayUTC()
): DisplayPaymentStatus {
  if (status === "owed" && dueDate && today > dueDate) return "overdue";
  return status;
}

export const PAYMENT_STATUS_LABELS: Record<DisplayPaymentStatus, string> = {
  owed: "Owed",
  marked_paid: "Marked paid",
  confirmed: "Confirmed",
  overdue: "Overdue",
};

/** Cents -> "12.34" (no currency symbol, no thousands separator) for payment-app URLs. */
export function centsToAmountString(cents: number): string {
  const safe = Math.max(0, Math.round(cents));
  return `${Math.floor(safe / 100)}.${String(safe % 100).padStart(2, "0")}`;
}

/** Normalise user-entered handles: trim, drop a leading @ / $ and any pasted URL prefix. */
export function normalizeVenmoHandle(input: string | null | undefined): string {
  return (input ?? "")
    .trim()
    .replace(/^https?:\/\/(www\.)?venmo\.com\/(u\/)?/i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
}

export function normalizeCashtag(input: string | null | undefined): string {
  return (input ?? "")
    .trim()
    .replace(/^https?:\/\/(www\.)?cash\.app\//i, "")
    .replace(/^\$/, "")
    .replace(/[/?#].*$/, "");
}

export function normalizePaypalMe(input: string | null | undefined): string {
  return (input ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?paypal\.me\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
}

export type VenmoLinks = { app: string; web: string };

/** Venmo deep link (opens the app with a prefilled payment) plus a web fallback. */
export function buildVenmoLinks(handle: string, amountCents: number, note: string): VenmoLinks | null {
  const h = normalizeVenmoHandle(handle);
  if (!h) return null;
  const params = new URLSearchParams({
    txn: "pay",
    recipients: h,
    amount: centsToAmountString(amountCents),
    note,
  });
  const webParams = new URLSearchParams({
    txn: "pay",
    amount: centsToAmountString(amountCents),
    note,
  });
  return {
    app: `venmo://paycharge?${params.toString()}`,
    web: `https://venmo.com/${encodeURIComponent(h)}?${webParams.toString()}`,
  };
}

/** Cash App link with the amount prefilled: https://cash.app/$tag/12.34 */
export function buildCashAppLink(cashtag: string, amountCents: number): string | null {
  const tag = normalizeCashtag(cashtag);
  if (!tag) return null;
  return `https://cash.app/$${encodeURIComponent(tag)}/${centsToAmountString(amountCents)}`;
}

/** PayPal.me link with the amount prefilled: https://paypal.me/name/12.34USD */
export function buildPaypalLink(paypalMe: string, amountCents: number): string | null {
  const name = normalizePaypalMe(paypalMe);
  if (!name) return null;
  return `https://paypal.me/${encodeURIComponent(name)}/${centsToAmountString(amountCents)}USD`;
}

/** Note prefilled in the payment app, e.g. "FairSplit · 575 McKinney · Oct 2025". */
export function buildPaymentNote(propertyName: string, cycleLabel: string): string {
  return ["FairSplit", propertyName, cycleLabel]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" · ")
    .slice(0, 140);
}

export function hasAnyPaymentMethod(m: Partial<OwnerPaymentMethods> | null | undefined): boolean {
  return !!(m && (m.venmo_handle || m.cashapp_handle || m.zelle_contact || m.paypal_me || m.instructions));
}
