import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUtilityAccountsWithLastBill } from "@/lib/server/utility-accounts";
import { NewCycleForm } from "@/components/owner/new-cycle-form";

interface PageProps {
  params: { propertyId: string };
}

export default async function NewCyclePage({ params }: PageProps) {
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

  const accounts = await getUtilityAccountsWithLastBill(property.id, { activeOnly: true });

  return (
    <NewCycleForm
      propertyId={property.id}
      accounts={accounts.map((a) => ({
        id: a.id,
        category: a.category,
        provider: a.provider,
        account_number_last4: a.account_number_last4,
        typical_amount_cents: a.typical_amount_cents,
        lastBill: a.lastBill,
      }))}
    />
  );
}
