import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MetricCard } from "@/components/shared/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Receipt, DollarSign, Plus, ChevronRight, MapPin } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { formatCents } from "@/lib/utils";
import Link from "next/link";
import { getOwnerSpendingTrend, getOwnerCategoryBreakdown } from "@/lib/queries/analytics";
import { SpendingTrendChart } from "@/components/shared/spending-trend-chart";
import { CategoryBreakdownChart } from "@/components/shared/category-breakdown-chart";
import { OnboardingEmptyState } from "@/components/owner/onboarding-empty-state";

// Valid UUID that matches no row; keeps .in() queries valid when the list is empty.
const NO_MATCH_UUID = "00000000-0000-0000-0000-000000000000";

export default async function OwnerDashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch owner's properties
  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("owner_id", user.id)
    .is("deleted_at", null);

  if (!properties || properties.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeading title="Dashboard" description="Let's get your first property set up." />
        <OnboardingEmptyState />
      </div>
    );
  }

  const propertyIds = properties?.map((p) => p.id) || [];

  // Fetch tenant count
  const { count: tenantCount } = await supabase
    .from("property_tenants")
    .select("*", { count: "exact", head: true })
    .in("property_id", propertyIds.length > 0 ? propertyIds : [NO_MATCH_UUID])
    .eq("status", "active");

  // Fetch total billed
  const { data: bills } = await supabase
    .from("bills")
    .select("amount_cents")
    .in("property_id", propertyIds.length > 0 ? propertyIds : [NO_MATCH_UUID]);

  const totalBilledCents = bills?.reduce((sum, b) => sum + b.amount_cents, 0) || 0;

  // Fetch active cycles
  const { count: activeCycles } = await supabase
    .from("billing_cycles")
    .select("*", { count: "exact", head: true })
    .in("property_id", propertyIds.length > 0 ? propertyIds : [NO_MATCH_UUID])
    .in("status", ["draft", "open"]);

  // Analytics
  const spendingTrend = await getOwnerSpendingTrend(propertyIds);
  const categoryBreakdown = await getOwnerCategoryBreakdown(propertyIds);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Dashboard"
        description="Overview of your properties and billing"
        actions={
          <Button asChild>
            <Link href="/dashboard/owner/properties/new">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add Property
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard
          title="Properties"
          value={properties?.length || 0}
          icon={<Building2 className="h-4 w-4" />}
        />
        <MetricCard
          title="Active Tenants"
          value={tenantCount || 0}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Total Billed"
          value={formatCents(totalBilledCents)}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricCard
          title="Active Cycles"
          value={activeCycles || 0}
          tone={(activeCycles || 0) > 0 ? "info" : "default"}
          icon={<Receipt className="h-4 w-4" />}
        />
      </div>

      {spendingTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Spending Trend</CardTitle>
            <CardDescription>Monthly utility spending across all properties</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <SpendingTrendChart data={spendingTrend} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-display text-lg">Your Properties</CardTitle>
            <CardDescription>
              {properties?.length
                ? `You have ${properties.length} ${properties.length === 1 ? "property" : "properties"}`
                : "No properties yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-lg border">
              {properties.map((property) => (
                <li key={property.id}>
                  <Link
                    href={`/dashboard/owner/properties/${property.id}/overview`}
                    className="group flex items-center gap-3 px-3 py-3 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
                    >
                      <Building2 className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{property.name}</span>
                      <span className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                        {property.city}, {property.state}
                      </span>
                    </span>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-lg">Category Breakdown</CardTitle>
            <CardDescription>Spending by utility category</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <CategoryBreakdownChart data={categoryBreakdown} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
