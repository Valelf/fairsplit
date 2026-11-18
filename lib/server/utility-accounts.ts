import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { UtilityAccount } from "@/lib/supabase/types";
import { latestBill, type PreviousBill } from "@/lib/utilities/suggest";

export type UtilityAccountWithLastBill = UtilityAccount & { lastBill: PreviousBill | null };

/**
 * A property's (non-deleted) utility accounts, each with its most recent bill.
 * RLS limits rows to the property's owner / tenants / admins.
 */
export async function getUtilityAccountsWithLastBill(
  propertyId: string,
  opts: { activeOnly?: boolean } = {}
): Promise<UtilityAccountWithLastBill[]> {
  const supabase = createClient();
  let query = supabase
    .from("utility_accounts")
    .select("*")
    .eq("property_id", propertyId)
    .is("deleted_at", null)
    .order("active", { ascending: false })
    .order("category")
    .order("provider");
  if (opts.activeOnly) query = query.eq("active", true);
  const { data: accounts } = await query;
  if (!accounts || accounts.length === 0) return [];

  const { data: bills } = await supabase
    .from("bills")
    .select("utility_account_id, amount_cents, service_start, service_end")
    .eq("property_id", propertyId)
    .in(
      "utility_account_id",
      accounts.map((a) => a.id)
    );

  const byAccount = new Map<string, PreviousBill[]>();
  for (const b of bills ?? []) {
    if (!b.utility_account_id) continue;
    const list = byAccount.get(b.utility_account_id) ?? [];
    list.push(b);
    byAccount.set(b.utility_account_id, list);
  }

  return accounts.map((a) => ({ ...a, lastBill: latestBill(byAccount.get(a.id) ?? []) }));
}
