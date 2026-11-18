import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * (Re)calculate a bill's splits atomically in the database (public.recalculate_bill_splits,
 * which mirrors lib/calculations/person-days.ts). Existing split rows are upserted, so payment
 * columns survive. Returns an error message or null.
 */
export async function recalculateBillSplits(billId: string): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase.rpc("recalculate_bill_splits", { p_bill_id: billId });
  return error ? error.message : null;
}

/** Recalculate all bills of a property (only those ending on/after `from`, when given). */
export async function recalculatePropertySplits(
  propertyId: string,
  from: string | null = null
): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase.rpc("recalculate_property_splits", {
    p_property_id: propertyId,
    p_from: from,
  });
  return error ? error.message : null;
}

/** @deprecated kept for existing callers; delegates to the atomic database recalculation. */
export async function calculateAndStoreSplits(billId: string): Promise<string | null> {
  return recalculateBillSplits(billId);
}
