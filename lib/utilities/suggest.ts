/**
 * Pure helpers that pre-fill a new bill from a utility account and its previous bill.
 * All dates are UTC "YYYY-MM-DD" strings.
 */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function parse(date: string | null | undefined): { y: number; m: number; d: number } | null {
  if (!date) return null;
  const match = ISO.exec(date);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  const t = new Date(Date.UTC(y, m, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m || t.getUTCDate() !== d) return null;
  return { y, m, d };
}

function fmt(t: Date): string {
  return t.toISOString().slice(0, 10);
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

/** Add `days` to an ISO date. Returns null for invalid input. */
export function addDays(date: string, days: number): string | null {
  const p = parse(date);
  if (!p) return null;
  return fmt(new Date(Date.UTC(p.y, p.m, p.d + days)));
}

/**
 * Add whole months to an ISO date, clamping to the end of the target month
 * (Jan 31 + 1 month = Feb 28/29). A date that is the last day of its month
 * stays on the last day (Feb 28 + 1 month = Mar 31).
 */
export function addMonths(date: string, months: number): string | null {
  const p = parse(date);
  if (!p) return null;
  const total = p.m + months;
  const y = p.y + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  const dim = daysInMonth(y, m);
  const isMonthEnd = p.d === daysInMonth(p.y, p.m);
  const d = isMonthEnd ? dim : Math.min(p.d, dim);
  return fmt(new Date(Date.UTC(y, m, d)));
}

/**
 * Service dates for the next bill on an account: starts the day after the previous
 * bill's service_end and runs one month (ends one month after the previous end).
 */
export function continueServiceDates(
  previousEnd: string | null | undefined
): { start: string; end: string } | null {
  if (!previousEnd) return null;
  const start = addDays(previousEnd, 1);
  const end = addMonths(previousEnd, 1);
  if (!start || !end) return null;
  return { start, end };
}

export type PreviousBill = {
  amount_cents: number;
  service_start: string;
  service_end: string;
};

export type AccountForSuggestion = {
  category: string;
  provider: string;
  typical_amount_cents: number | null;
};

export type BillSuggestion = {
  category: string;
  provider: string;
  /** Amount to pre-fill: last bill's amount, else the account's typical amount. */
  amount_cents: number | null;
  amountSource: "last" | "typical" | null;
  service_start: string;
  service_end: string;
  datesSource: "continued" | "cycle" | null;
};

/**
 * Pre-fill values for a new bill. Dates continue from the previous bill when there is one,
 * otherwise fall back to the cycle's dates (if any). Everything stays editable in the form.
 */
export function suggestBill(
  account: AccountForSuggestion,
  previous: PreviousBill | null,
  cycle?: { start_date: string | null; end_date: string | null } | null
): BillSuggestion {
  const continued = continueServiceDates(previous?.service_end);
  let service_start = "";
  let service_end = "";
  let datesSource: BillSuggestion["datesSource"] = null;
  if (continued) {
    service_start = continued.start;
    service_end = continued.end;
    datesSource = "continued";
  } else if (cycle?.start_date && cycle?.end_date) {
    service_start = cycle.start_date;
    service_end = cycle.end_date;
    datesSource = "cycle";
  }

  let amount_cents: number | null = null;
  let amountSource: BillSuggestion["amountSource"] = null;
  if (previous && previous.amount_cents > 0) {
    amount_cents = previous.amount_cents;
    amountSource = "last";
  } else if (account.typical_amount_cents && account.typical_amount_cents > 0) {
    amount_cents = account.typical_amount_cents;
    amountSource = "typical";
  }

  return {
    category: account.category,
    provider: account.provider,
    amount_cents,
    amountSource,
    service_start,
    service_end,
    datesSource,
  };
}

/** Pick the most recent bill (by service_end, then service_start) from a list. */
export function latestBill<T extends { service_start: string; service_end: string }>(
  bills: readonly T[]
): T | null {
  let best: T | null = null;
  for (const b of bills) {
    if (
      !best ||
      b.service_end > best.service_end ||
      (b.service_end === best.service_end && b.service_start > best.service_start)
    ) {
      best = b;
    }
  }
  return best;
}

/**
 * Normalize user input to the last 4 characters of an account number (letters/digits only).
 * Returns null when nothing usable is left. Never keep more than 4 characters.
 */
export function toLast4(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = input.replace(/[^0-9A-Za-z]/g, "");
  if (!cleaned) return null;
  return cleaned.slice(-4);
}
