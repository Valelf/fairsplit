import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUtilityAccountsWithLastBill } from "@/lib/server/utility-accounts";
import { NewBillForm } from "@/components/owner/new-bill-form";

interface PageProps {
  params: { propertyId: string };
  searchParams: { cycleId?: string; accountId?: string };
}

export default async function NewBillPage({ params, searchParams }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", params.propertyId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!property) notFound();

  const cycleId = typeof searchParams.cycleId === "string" ? searchParams.cycleId : "";
  const accountId = typeof searchParams.accountId === "string" ? searchParams.accountId : null;

  const [{ data: cycle }, accounts, { data: tenants }] = await Promise.all([
    cycleId
      ? supabase
          .from("billing_cycles")
          .select("start_date, end_date")
          .eq("id", cycleId)
          .eq("property_id", property.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getUtilityAccountsWithLastBill(property.id, { activeOnly: true }),
    supabase
      .from("property_tenants")
      .select("id, display_name, join_date, leave_date")
      .eq("property_id", property.id)
      .order("join_date"),
  ]);

  return (
    <NewBillForm
      propertyId={property.id}
      cycleId={cycleId}
      cycle={cycle ? { start_date: cycle.start_date ?? null, end_date: cycle.end_date ?? null } : null}
      accounts={accounts.map((a) => ({
        id: a.id,
        category: a.category,
        provider: a.provider,
        account_number_last4: a.account_number_last4,
        typical_amount_cents: a.typical_amount_cents,
        lastBill: a.lastBill,
      }))}
      initialAccountId={accountId}
      tenants={tenants ?? []}
    />
  );
}
