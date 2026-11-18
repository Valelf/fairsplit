import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PaymentMethodsForm } from "@/components/owner/payment-methods-form";
import { OwnerEmailPrefsCard } from "@/components/owner/owner-email-prefs-card";

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">How your tenants pay you</p>
      </div>
      <PaymentMethodsForm initial={methods} />
      <OwnerEmailPrefsCard />
    </div>
  );
}
