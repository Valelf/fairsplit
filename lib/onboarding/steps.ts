import { z } from "zod";
import { BILL_CATEGORY_VALUES } from "@/lib/utilities/categories";

/** Pure helpers for the landlord onboarding wizard (no server or browser APIs). */

export const ONBOARDING_STEPS = ["house", "tenants", "bill", "done"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const STEP_LABELS: Record<OnboardingStep, string> = {
  house: "Your house",
  tenants: "Who lives there",
  bill: "First bill",
  done: "Done",
};

export interface OnboardingProgress {
  hasProperty: boolean;
  tenantCount: number;
  billCount: number;
}

/** The first step that still needs doing, based only on what's in the database. */
export function deriveOnboardingStep(p: OnboardingProgress): OnboardingStep {
  if (!p.hasProperty) return "house";
  if (p.tenantCount === 0) return "tenants";
  if (p.billCount === 0) return "bill";
  return "done";
}

export function isOnboardingStep(value: unknown): value is OnboardingStep {
  return typeof value === "string" && (ONBOARDING_STEPS as readonly string[]).includes(value);
}

/**
 * Step to show. An explicit ?step= (from "Back" or "Skip for now") wins, except that the
 * tenants and bill steps need a house to attach to, so they fall back to the house step.
 */
export function resolveOnboardingStep(p: OnboardingProgress, requested?: string | null): OnboardingStep {
  if (isOnboardingStep(requested)) {
    if ((requested === "tenants" || requested === "bill") && !p.hasProperty) return "house";
    return requested;
  }
  return deriveOnboardingStep(p);
}

export function nextStep(step: OnboardingStep): OnboardingStep {
  const i = ONBOARDING_STEPS.indexOf(step);
  return ONBOARDING_STEPS[Math.min(i + 1, ONBOARDING_STEPS.length - 1)];
}

export function previousStep(step: OnboardingStep): OnboardingStep | null {
  const i = ONBOARDING_STEPS.indexOf(step);
  return i > 0 ? ONBOARDING_STEPS[i - 1] : null;
}

// ---------------------------------------------------------------------------
// Dates and money
// ---------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Previous full calendar month (UTC) — the usual first bill a landlord has in hand. */
export function defaultCycleDates(today: Date = new Date()): { start: string; end: string } {
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
  return { start: toIso(start), end: toIso(end) };
}

/** "Oct 2026" for a cycle inside one month, otherwise "Oct 15 – Nov 14, 2026". */
export function cycleLabel(start: string, end: string): string {
  const s = new Date(start + "T00:00:00Z");
  const e = new Date(end + "T00:00:00Z");
  const month = (d: Date) => d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const lastDay = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth() + 1, 0)).getUTCDate();
  if (
    s.getUTCFullYear() === e.getUTCFullYear() &&
    s.getUTCMonth() === e.getUTCMonth() &&
    s.getUTCDate() === 1 &&
    e.getUTCDate() === lastDay
  ) {
    return `${month(s)} ${s.getUTCFullYear()}`;
  }
  const sameYear = s.getUTCFullYear() === e.getUTCFullYear();
  return `${month(s)} ${s.getUTCDate()}${sameYear ? "" : `, ${s.getUTCFullYear()}`} – ${month(e)} ${e.getUTCDate()}, ${e.getUTCFullYear()}`;
}

/** "$1,234.56", "1234.5", "12" → cents. Returns null for anything else. */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Plain-English person-days math for one share: "31 of 62 person-days × $100.00". */
export function describeShare(personDays: number, totalPersonDays: number, billCents: number): string {
  const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(billCents / 100);
  const unit = totalPersonDays === 1 ? "person-day" : "person-days";
  return `${personDays} of ${totalPersonDays} ${unit} × ${dollars}`;
}

// ---------------------------------------------------------------------------
// Form validation (shared by the client forms and the server actions)
// ---------------------------------------------------------------------------

const isoDate = (label: string) =>
  z.string().refine(isIsoDate, { message: `${label} must be a valid date` });

export const houseSchema = z.object({
  name: z.string().trim().min(1, "Give your house a name").max(100, "Keep the name under 100 characters"),
  address_line1: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().max(100).optional().default(""),
  state: z.string().trim().max(50).optional().default(""),
  zip_code: z.string().trim().max(20).optional().default(""),
});
export type HouseInput = z.input<typeof houseSchema>;

export const tenantSchema = z.object({
  display_name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  join_date: isoDate("Move-in date"),
});
export type TenantInput = z.input<typeof tenantSchema>;

export const BILL_CATEGORIES = BILL_CATEGORY_VALUES;

export const firstBillSchema = z
  .object({
    property_id: z.string().uuid(),
    cycle_start: isoDate("Cycle start"),
    cycle_end: isoDate("Cycle end"),
    category: z.enum(BILL_CATEGORIES),
    provider: z.string().trim().min(1, "Who sent the bill? (e.g. the electric company)").max(100),
    amount: z.string().refine((v) => (parseDollarsToCents(v) ?? 0) > 0, {
      message: "Enter the bill amount, like 142.50",
    }),
    service_start: isoDate("Service start"),
    service_end: isoDate("Service end"),
  })
  .refine((v) => v.cycle_start <= v.cycle_end, {
    message: "The cycle must end on or after it starts",
    path: ["cycle_end"],
  })
  .refine((v) => v.service_start <= v.service_end, {
    message: "The service period must end on or after it starts",
    path: ["service_end"],
  });
export type FirstBillInput = z.input<typeof firstBillSchema>;

/** First error message from a failed safeParse, for one-line form errors. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form";
}
