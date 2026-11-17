import { createClient } from "@/lib/supabase/server";

export interface MonthlyTotal {
  month: string; // "YYYY-MM"
  label: string; // "Jan 2025"
  totalCents: number;
}

export interface CategoryBreakdown {
  category: string;
  totalCents: number;
}

export interface UserGrowthPoint {
  month: string;
  label: string;
  owners: number;
  tenants: number;
}

export interface BillVolumePoint {
  month: string;
  label: string;
  count: number;
  totalCents: number;
}

const monthLabels = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatMonthLabel(dateStr: string): string {
  const [year, month] = dateStr.split("-");
  return `${monthLabels[parseInt(month) - 1]} ${year}`;
}

export async function getOwnerSpendingTrend(
  propertyIds: string[]
): Promise<MonthlyTotal[]> {
  if (propertyIds.length === 0) return [];

  const supabase = createClient();

  const { data: bills } = await supabase
    .from("bills")
    .select("amount_cents, service_start")
    .in("property_id", propertyIds)
    .order("service_start", { ascending: true });

  if (!bills || bills.length === 0) return [];

  const monthMap = new Map<string, number>();

  for (const bill of bills) {
    const month = bill.service_start.substring(0, 7); // "YYYY-MM"
    monthMap.set(month, (monthMap.get(month) || 0) + bill.amount_cents);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12) // Last 12 months
    .map(([month, totalCents]) => ({
      month,
      label: formatMonthLabel(month),
      totalCents,
    }));
}

export async function getOwnerCategoryBreakdown(
  propertyIds: string[]
): Promise<CategoryBreakdown[]> {
  if (propertyIds.length === 0) return [];

  const supabase = createClient();

  const { data: bills } = await supabase
    .from("bills")
    .select("category, amount_cents")
    .in("property_id", propertyIds);

  if (!bills || bills.length === 0) return [];

  const categoryMap = new Map<string, number>();

  for (const bill of bills) {
    categoryMap.set(
      bill.category,
      (categoryMap.get(bill.category) || 0) + bill.amount_cents
    );
  }

  return Array.from(categoryMap.entries())
    .map(([category, totalCents]) => ({ category, totalCents }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

export async function getTenantSpendingTrend(
  tenantIds: string[]
): Promise<MonthlyTotal[]> {
  if (tenantIds.length === 0) return [];

  const supabase = createClient();

  const { data: splits } = await supabase
    .from("bill_splits")
    .select("amount_cents, bills!inner(service_start)")
    .in("tenant_id", tenantIds);

  if (!splits || splits.length === 0) return [];

  const monthMap = new Map<string, number>();

  for (const split of splits) {
    const serviceStart = (split as any).bills?.service_start;
    if (!serviceStart) continue;
    const month = serviceStart.substring(0, 7);
    monthMap.set(month, (monthMap.get(month) || 0) + split.amount_cents);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, totalCents]) => ({
      month,
      label: formatMonthLabel(month),
      totalCents,
    }));
}

export async function getAdminUserGrowth(): Promise<UserGrowthPoint[]> {
  const supabase = createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("role, created_at")
    .order("created_at", { ascending: true });

  if (!profiles || profiles.length === 0) return [];

  const monthMap = new Map<string, { owners: number; tenants: number }>();

  for (const profile of profiles) {
    const month = profile.created_at.substring(0, 7);
    const existing = monthMap.get(month) || { owners: 0, tenants: 0 };
    if (profile.role === "owner") existing.owners++;
    else if (profile.role === "tenant") existing.tenants++;
    monthMap.set(month, existing);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, data]) => ({
      month,
      label: formatMonthLabel(month),
      ...data,
    }));
}

export async function getAdminBillVolume(): Promise<BillVolumePoint[]> {
  const supabase = createClient();

  const { data: bills } = await supabase
    .from("bills")
    .select("amount_cents, created_at")
    .order("created_at", { ascending: true });

  if (!bills || bills.length === 0) return [];

  const monthMap = new Map<string, { count: number; totalCents: number }>();

  for (const bill of bills) {
    const month = bill.created_at.substring(0, 7);
    const existing = monthMap.get(month) || { count: 0, totalCents: 0 };
    existing.count++;
    existing.totalCents += bill.amount_cents;
    monthMap.set(month, existing);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, data]) => ({
      month,
      label: formatMonthLabel(month),
      ...data,
    }));
}
