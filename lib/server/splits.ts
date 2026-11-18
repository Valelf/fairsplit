import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  calculateBillSplitCents,
  type TenantPeriod,
} from "@/lib/calculations/person-days";

export async function calculateAndStoreSplits(
  billId: string,
  propertyId: string,
  amountCents: number,
  serviceStart: string,
  serviceEnd: string
): Promise<string | null> {
  const supabase = createClient();

  // Fetch all tenants for this property
  const { data: tenants, error: tenantError } = await supabase
    .from("property_tenants")
    .select("id, join_date, leave_date")
    .eq("property_id", propertyId);

  if (tenantError) {
    return tenantError.message;
  }

  if (!tenants || tenants.length === 0) {
    return null; // No tenants to split with
  }

  const tenantPeriods: TenantPeriod[] = tenants.map((t) => ({
    tenantId: t.id,
    joinDate: t.join_date,
    leaveDate: t.leave_date,
  }));

  const splits = calculateBillSplitCents(
    { amountCents, serviceStart, serviceEnd },
    tenantPeriods
  );

  // Store only tenants who were actually there (0-day rows would leak bills to departed tenants)
  const splitRows = splits.filter((s) => s.personDays > 0).map((s) => ({
    bill_id: billId,
    property_id: propertyId,
    tenant_id: s.tenantId,
    person_days: s.personDays,
    total_person_days: s.totalPersonDays,
    amount_cents: s.amountCents,
  }));

  const { error: splitError } = await supabase
    .from("bill_splits")
    .insert(splitRows);

  if (splitError) {
    return splitError.message;
  }

  return null;
}

