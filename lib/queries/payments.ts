import "server-only";

import { createClient } from "@/lib/supabase/server";
import { displayStatus, summarizeSplits, todayUTC, type DisplayPaymentStatus, type PaymentSummary } from "@/lib/payments";

export type LedgerRow = {
  propertyId: string;
  propertyName: string;
  cycleId: string;
  cycleLabel: string;
  cycleStatus: string;
  cycleCreatedAt: string;
  dueDate: string | null;
  propertyTenantId: string;
  tenantName: string;
  summary: PaymentSummary;
  status: DisplayPaymentStatus;
  markedPaidAt: string | null;
  confirmedAt: string | null;
  note: string | null;
};

type SplitRow = {
  tenant_id: string;
  property_id: string;
  amount_cents: number;
  payment_status: string | null;
  marked_paid_at: string | null;
  confirmed_at: string | null;
  payment_note: string | null;
  bills: { cycle_id: string } | { cycle_id: string }[] | null;
  property_tenants: { display_name: string } | { display_name: string }[] | null;
};

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
const latest = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);

/**
 * Per cycle x tenant payment rows for the signed-in owner's properties (RLS-scoped).
 * Optionally narrowed to one property and/or one cycle. Draft cycles are excluded unless a cycleId is given.
 */
export async function getOwnerPaymentLedger(opts: { propertyId?: string; cycleId?: string } = {}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { properties: [], rows: [] as LedgerRow[] };

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("name");
  const props = properties ?? [];
  const propertyIds = (opts.propertyId ? props.filter((p) => p.id === opts.propertyId) : props).map((p) => p.id);
  if (propertyIds.length === 0) return { properties: props, rows: [] as LedgerRow[] };

  let cycleQuery = supabase
    .from("billing_cycles")
    .select("id, property_id, label, status, due_date, created_at")
    .in("property_id", propertyIds);
  cycleQuery = opts.cycleId ? cycleQuery.eq("id", opts.cycleId) : cycleQuery.neq("status", "draft");
  const { data: cycles } = await cycleQuery;
  const cycleMap = new Map((cycles ?? []).map((c) => [c.id, c]));
  if (cycleMap.size === 0) return { properties: props, rows: [] as LedgerRow[] };

  let splitQuery = supabase
    .from("bill_splits")
    .select(
      "tenant_id, property_id, amount_cents, payment_status, marked_paid_at, confirmed_at, payment_note, bills!inner(cycle_id), property_tenants!inner(display_name)"
    )
    .in("property_id", propertyIds)
    .limit(5000);
  if (opts.cycleId) splitQuery = splitQuery.eq("bills.cycle_id", opts.cycleId);
  const { data: splits } = await splitQuery;

  const propName = new Map(props.map((p) => [p.id, p.name]));
  const groups = new Map<string, { cycleId: string; tenantId: string; tenantName: string; splits: SplitRow[] }>();
  for (const s of (splits ?? []) as unknown as SplitRow[]) {
    const cycleId = one(s.bills)?.cycle_id;
    if (!cycleId || !cycleMap.has(cycleId)) continue;
    const key = `${cycleId}:${s.tenant_id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        cycleId,
        tenantId: s.tenant_id,
        tenantName: one(s.property_tenants)?.display_name ?? "Unknown",
        splits: [],
      });
    }
    groups.get(key)!.splits.push(s);
  }

  const today = todayUTC();
  const rows: LedgerRow[] = Array.from(groups.values()).map((g) => {
    const cycle = cycleMap.get(g.cycleId)!;
    const summary = summarizeSplits(g.splits);
    const noted = g.splits.find((s) => s.payment_note)?.payment_note ?? null;
    return {
      propertyId: cycle.property_id,
      propertyName: propName.get(cycle.property_id) ?? "",
      cycleId: cycle.id,
      cycleLabel: cycle.label,
      cycleStatus: cycle.status,
      cycleCreatedAt: cycle.created_at,
      dueDate: cycle.due_date ?? null,
      propertyTenantId: g.tenantId,
      tenantName: g.tenantName,
      summary,
      status: displayStatus(summary.status, cycle.due_date, today),
      markedPaidAt: g.splits.reduce<string | null>((acc, s) => latest(acc, s.marked_paid_at), null),
      confirmedAt: g.splits.reduce<string | null>((acc, s) => latest(acc, s.confirmed_at), null),
      note: noted,
    };
  });

  rows.sort(
    (a, b) =>
      b.cycleCreatedAt.localeCompare(a.cycleCreatedAt) ||
      a.propertyName.localeCompare(b.propertyName) ||
      a.tenantName.localeCompare(b.tenantName)
  );

  return { properties: props, rows };
}
