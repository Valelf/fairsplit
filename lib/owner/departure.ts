import {
  calculateBillSplitCents,
  sortTenantPeriods,
  type TenantPeriod,
} from "@/lib/calculations/person-days";

export interface PreviewBill {
  billId: string;
  label: string;
  amountCents: number;
  serviceStart: string;
  serviceEnd: string;
}

export interface TenantDateChangeRow {
  billId: string;
  label: string;
  serviceStart: string;
  serviceEnd: string;
  beforeCents: number;
  afterCents: number;
  beforeDays: number;
  afterDays: number;
}

/**
 * Preview how a change to one tenant's dates changes that tenant's share of each bill.
 * Uses the same algorithm and tenant order as the database recalculation.
 * With `onlyChanged` (default), bills where nothing changes for the tenant are left out.
 */
export function previewTenantDateChange(
  bills: PreviewBill[],
  tenants: TenantPeriod[],
  tenantId: string,
  change: { joinDate?: string; leaveDate?: string | null },
  onlyChanged = true
): TenantDateChangeRow[] {
  const before = sortTenantPeriods(tenants);
  const after = sortTenantPeriods(
    tenants.map((t) =>
      t.tenantId === tenantId
        ? {
            ...t,
            joinDate: change.joinDate ?? t.joinDate,
            leaveDate: change.leaveDate === undefined ? t.leaveDate : change.leaveDate,
          }
        : t
    )
  );
  const rows: TenantDateChangeRow[] = [];
  for (const bill of bills) {
    const input = {
      amountCents: bill.amountCents,
      serviceStart: bill.serviceStart,
      serviceEnd: bill.serviceEnd,
    };
    const b = calculateBillSplitCents(input, before).find((s) => s.tenantId === tenantId);
    const a = calculateBillSplitCents(input, after).find((s) => s.tenantId === tenantId);
    const row: TenantDateChangeRow = {
      billId: bill.billId,
      label: bill.label,
      serviceStart: bill.serviceStart,
      serviceEnd: bill.serviceEnd,
      beforeCents: b?.amountCents ?? 0,
      afterCents: a?.amountCents ?? 0,
      beforeDays: b?.personDays ?? 0,
      afterDays: a?.personDays ?? 0,
    };
    const changed = row.beforeCents !== row.afterCents || row.beforeDays !== row.afterDays;
    if (changed || (!onlyChanged && (row.beforeDays > 0 || row.afterDays > 0))) rows.push(row);
  }
  return rows;
}

/** Earliest of the given dates: bills that end before it cannot be affected by the change. */
export function earliestAffectedDate(dates: Array<string | null | undefined>): string | null {
  const valid = dates.filter((d): d is string => !!d).sort();
  return valid[0] ?? null;
}
