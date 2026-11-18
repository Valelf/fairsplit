import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeading } from "@/components/layout/page-heading";
import { PaymentMethodsForm } from "@/components/owner/payment-methods-form";

export default async function OwnerSettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: methods } = await supabase
    .from("owner_payment_methods")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <PageHeading title="Settings" description="How your tenants pay you." />
      <PaymentMethodsForm initial={methods} />
    </div>
  );
}
