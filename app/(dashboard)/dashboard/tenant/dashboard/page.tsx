import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MetricCard } from "@/components/shared/metric-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ChevronRight, DollarSign, Receipt } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { formatCents } from "@/lib/utils";
import { summarizeSplits } from "@/lib/payments";
import Link from "next/link";
import { getTenantSpendingTrend } from "@/lib/queries/analytics";
import { SpendingTrendChart } from "@/components/shared/spending-trend-chart";

// Valid UUID that matches no row; keeps .in() queries valid when the list is empty.
const NO_MATCH_UUID = "00000000-0000-0000-0000-000000000000";

export default async function TenantDashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch properties this tenant belongs to
  const { data: tenantRecords } = await supabase
    .from("property_tenants")
    .select("*, properties(*)")
    .eq("tenant_id", user.id)
    .in("status", ["active", "departed"]);

  const properties = tenantRecords?.map((r: any) => r.properties).filter(Boolean) || [];
  const tenantIds = tenantRecords?.map((r) => r.id) || [];

  // Outstanding balance: owed, plus marked-paid amounts still awaiting the owner's confirmation
  const { data: splits } = await supabase
    .from("bill_splits")
    .select("amount_cents, payment_status")
    .in("tenant_id", tenantIds.length > 0 ? tenantIds : [NO_MATCH_UUID]);

  const balance = summarizeSplits(splits ?? []);

  // Count cycles
  const propertyIds = properties.map((p: any) => p.id);
  const { count: cycleCount } = await supabase
    .from("billing_cycles")
    .select("*", { count: "exact", head: true })
    .in("property_id", propertyIds.length > 0 ? propertyIds : [NO_MATCH_UUID]);

  // Analytics
  const spendingTrend = await getTenantSpendingTrend(tenantIds);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Dashboard"
        description="What you owe and what you've paid, across your homes."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        <MetricCard
          className="col-span-2 md:col-span-1"
          tone={balance.owedCents > 0 ? "attention" : balance.totalCents > 0 ? "positive" : "default"}
          title="Outstanding"
          value={formatCents(balance.owedCents)}
          description={
            balance.markedPaidCents > 0
              ? `${formatCents(balance.markedPaidCents)} marked paid, awaiting confirmation`
              : balance.totalCents > 0 && balance.owedCents === 0
                ? "You're all paid up"
                : undefined
          }
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricCard
          title="Properties"
          value={properties.length}
          icon={<Building2 className="h-4 w-4" />}
        />
        <MetricCard
          title="Billing cycles"
          value={cycleCount || 0}
          icon={<Receipt className="h-4 w-4" />}
        />
      </div>

      {spendingTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your spending trend</CardTitle>
            <CardDescription>Monthly utility costs across all properties</CardDescription>
          </CardHeader>
          <CardContent>
            <SpendingTrendChart data={spendingTrend} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your homes</CardTitle>
          <CardDescription>Open one to see its bills and your share.</CardDescription>
        </CardHeader>
        <CardContent>
          {properties.length > 0 ? (
            <div className="space-y-2">
              {properties.map((property: any) => (
                <Link
                  key={property.id}
                  href={`/dashboard/tenant/properties/${property.id}/bills`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{property.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {property.city}, {property.state}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyPanel
              icon={Building2}
              title="No homes yet"
              description="Ask your landlord to send you an invite link. Your bills show up here once you join."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
