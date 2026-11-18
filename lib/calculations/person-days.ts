/**
 * Person-days bill splitting algorithm.
 * Port of app/utils/calculations.ts to work with database types (cents).
 *
 * Core algorithm:
 * 1. For each bill, iterate through every day of the service period (inclusive)
 * 2. On each day, count which tenants were active (join_date <= day <= leave_date or no leave_date)
 * 3. Accumulate person-days per tenant
 * 4. Each tenant's exact share = bill_amount_cents * (tenant_person_days / total_person_days)
 * 5. Floor every share to whole cents, then hand the leftover cents one at a time to the
 *    tenants with the largest fractional remainders (ties: more person-days, then input order).
 *    Callers pass tenants sorted by sortTenantPeriods (join_date, then id) so the order matches
 *    the database function public.recalculate_bill_splits.
 *    This guarantees the shares sum to the bill exactly (largest-remainder method).
 */

export interface TenantPeriod {
  tenantId: string;
  joinDate: string; // ISO date "YYYY-MM-DD"
  leaveDate: string | null; // ISO date or null if still active
}

export interface BillInput {
  amountCents: number;
  serviceStart: string; // ISO date
  serviceEnd: string; // ISO date
}

export interface SplitResult {
  tenantId: string;
  personDays: number;
  totalPersonDays: number;
  amountCents: number;
  /** Number of people sharing the bill; only set for the "equal_present" method. */
  shareCount?: number;
}

export type SplitMethod = "person_days" | "equal_present";

export const SPLIT_METHODS = ["person_days", "equal_present"] as const;

export interface SplitOptions {
  /** "person_days" (default): by days lived. "equal_present": equal shares among everyone with >= 1 day. */
  method?: SplitMethod;
  /** Tenants left out of this bill entirely (they get personDays 0 and no share). */
  excludedTenantIds?: Iterable<string>;
}

function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Calculate person-days split for a single bill.
 * Returns a SplitResult for each tenant (including those with 0 days).
 *
 * With options (mirrors public.recalculate_bill_splits):
 * - excluded tenants report personDays 0 / amountCents 0 and don't count towards totalPersonDays;
 * - "equal_present" weights every remaining tenant with > 0 days equally (still largest-remainder
 *   cents; ties: more person-days, then input order) and sets shareCount on the sharers' rows.
 */
export function calculateBillSplitCents(
  bill: BillInput,
  tenants: TenantPeriod[],
  options: SplitOptions = {}
): SplitResult[] {
  const method: SplitMethod = options.method ?? "person_days";
  const excluded = new Set(options.excludedTenantIds ?? []);
  const start = parseDate(bill.serviceStart);
  const end = parseDate(bill.serviceEnd);

  // Accumulate person-days per tenant
  const personDaysMap = new Map<string, number>();

  let cursor = start;
  while (cursor.getTime() <= end.getTime()) {
    const activeTenants = tenants.filter((t) => {
      if (excluded.has(t.tenantId)) return false;
      const join = parseDate(t.joinDate);
      const leave = t.leaveDate ? parseDate(t.leaveDate) : null;

      const hasJoined = cursor.getTime() >= join.getTime();
      const hasNotLeft = !leave || cursor.getTime() <= leave.getTime();

      return hasJoined && hasNotLeft;
    });

    for (const tenant of activeTenants) {
      const current = personDaysMap.get(tenant.tenantId) ?? 0;
      personDaysMap.set(tenant.tenantId, current + 1);
    }

    cursor = addDays(cursor, 1);
  }

  const totalPersonDays = Array.from(personDaysMap.values()).reduce(
    (sum, d) => sum + d,
    0
  );

  const rows = tenants.map((tenant, index) => {
    const personDays = personDaysMap.get(tenant.tenantId) ?? 0;
    return {
      tenantId: tenant.tenantId,
      personDays,
      totalPersonDays,
      amountCents: 0,
      index,
      weight: method === "equal_present" ? (personDays > 0 ? 1 : 0) : personDays,
    };
  });
  const results = allocate(bill.amountCents, rows);
  if (method !== "equal_present") return results;
  const shareCount = rows.filter((r) => r.weight > 0).length;
  return results.map((r) => (r.personDays > 0 ? { ...r, shareCount } : r));
}

/** Largest-remainder allocation of whole cents by weight (person-days, or 1 each for equal splits). */
function allocate(
  amountCents: number,
  rows: Array<SplitResult & { index: number; weight: number }>
): SplitResult[] {
  const total = rows.reduce((sum, r) => sum + r.weight, 0);
  if (total === 0) {
    return rows.map(({ index: _index, weight: _weight, ...r }) => ({ ...r, amountCents: 0 }));
  }
  const withShares = rows.map((r) => {
    // Integer arithmetic (same as the SQL recalculate_bill_splits): remainder is the numerator
    // over `total`, so ties compare exactly instead of via floating-point fractions.
    const numerator = amountCents * r.weight;
    const floor = Math.floor(numerator / total);
    return { ...r, floor, remainder: numerator - floor * total };
  });
  let leftover = amountCents - withShares.reduce((sum, r) => sum + r.floor, 0);
  const order = [...withShares]
    .filter((r) => r.weight > 0)
    .sort(
      (a, b) =>
        b.remainder - a.remainder ||
        b.personDays - a.personDays ||
        a.index - b.index
    );
  const bonus = new Map<number, number>();
  for (let i = 0; leftover > 0 && order.length > 0; i = (i + 1) % order.length) {
    bonus.set(order[i].index, (bonus.get(order[i].index) ?? 0) + 1);
    leftover -= 1;
  }
  return withShares.map((r) => ({
    tenantId: r.tenantId,
    personDays: r.personDays,
    totalPersonDays: r.totalPersonDays,
    amountCents: r.floor + (bonus.get(r.index) ?? 0),
  }));
}

/**
 * Calculate splits for all bills in a cycle.
 * Returns a flat array of SplitResults for all bill×tenant combinations.
 */
export function calculateCycleSplits(
  bills: Array<BillInput & { billId: string }>,
  tenants: TenantPeriod[]
): Array<SplitResult & { billId: string }> {
  const results: Array<SplitResult & { billId: string }> = [];

  for (const bill of bills) {
    const splits = calculateBillSplitCents(bill, tenants);
    for (const split of splits) {
      results.push({ ...split, billId: bill.billId });
    }
  }

  return results;
}

/** Stable tenant order shared with the SQL recalculation: join date, then id. */
export function sortTenantPeriods<T extends TenantPeriod>(tenants: T[]): T[] {
  return [...tenants].sort((a, b) =>
    a.joinDate < b.joinDate ? -1 : a.joinDate > b.joinDate ? 1 : a.tenantId < b.tenantId ? -1 : a.tenantId > b.tenantId ? 1 : 0
  );
}
