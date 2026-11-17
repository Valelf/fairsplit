import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MetricCard } from "@/components/shared/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Receipt, DollarSign, Plus } from "lucide-react";
import { formatCents } from "@/lib/utils";
import Link from "next/link";
import { getOwnerSpendingTrend, getOwnerCategoryBreakdown } from "@/lib/queries/analytics";
import { SpendingTrendChart } from "@/components/shared/spending-trend-chart";
import { CategoryBreakdownChart } from "@/components/shared/category-breakdown-chart";

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

  const propertyIds = properties?.map((p) => p.id) || [];

  // Fetch tenant count
  const { count: tenantCount } = await supabase
    .from("property_tenants")
    .select("*", { count: "exact", head: true })
    .in("property_id", propertyIds.length > 0 ? propertyIds : ["none"])
    .eq("status", "active");

  // Fetch total billed
  const { data: bills } = await supabase
    .from("bills")
    .select("amount_cents")
    .in("property_id", propertyIds.length > 0 ? propertyIds : ["none"]);

  const totalBilledCents = bills?.reduce((sum, b) => sum + b.amount_cents, 0) || 0;

  // Fetch active cycles
  const { count: activeCycles } = await supabase
    .from("billing_cycles")
    .select("*", { count: "exact", head: true })
    .in("property_id", propertyIds.length > 0 ? propertyIds : ["none"])
    .in("status", ["draft", "open"]);

  // Analytics
  const spendingTrend = await getOwnerSpendingTrend(propertyIds);
  const categoryBreakdown = await getOwnerCategoryBreakdown(propertyIds);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your properties and billing
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/owner/properties/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          icon={<Receipt className="h-4 w-4" />}
        />
      </div>

      {spendingTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spending Trend</CardTitle>
            <CardDescription>Monthly utility spending across all properties</CardDescription>
          </CardHeader>
          <CardContent>
            <SpendingTrendChart data={spendingTrend} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Properties</CardTitle>
            <CardDescription>
              {properties?.length
                ? `You have ${properties.length} ${properties.length === 1 ? "property" : "properties"}`
                : "No properties yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {properties && properties.length > 0 ? (
              <div className="space-y-3">
                {properties.map((property) => (
                  <Link
                    key={property.id}
                    href={`/dashboard/owner/properties/${property.id}/overview`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
                  >
                    <div>
                      <p className="font-medium">{property.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {property.city}, {property.state}
                      </p>
                    </div>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Add your first property to get started
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/dashboard/owner/properties/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Property
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Spending by utility category</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBreakdownChart data={categoryBreakdown} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
