/**
 * Person-days bill splitting algorithm.
 * Port of app/utils/calculations.ts to work with database types (cents).
 *
 * Core algorithm:
 * 1. For each bill, iterate through every day of the service period (inclusive)
 * 2. On each day, count which tenants were active (join_date <= day <= leave_date or no leave_date)
 * 3. Accumulate person-days per tenant
 * 4. Each tenant's share = bill_amount_cents * (tenant_person_days / total_person_days)
 * 5. Round to nearest cent
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
 */
export function calculateBillSplitCents(
  bill: BillInput,
  tenants: TenantPeriod[]
): SplitResult[] {
  const start = parseDate(bill.serviceStart);
  const end = parseDate(bill.serviceEnd);

  // Accumulate person-days per tenant
  const personDaysMap = new Map<string, number>();

  let cursor = start;
  while (cursor.getTime() <= end.getTime()) {
    const activeTenants = tenants.filter((t) => {
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

  // Calculate each tenant's share
  return tenants.map((tenant) => {
    const days = personDaysMap.get(tenant.tenantId) ?? 0;

    let amountCents = 0;
    if (totalPersonDays > 0 && days > 0) {
      amountCents = Math.round((bill.amountCents * days) / totalPersonDays);
    }

    return {
      tenantId: tenant.tenantId,
      personDays: days,
      totalPersonDays,
      amountCents,
    };
  });
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
