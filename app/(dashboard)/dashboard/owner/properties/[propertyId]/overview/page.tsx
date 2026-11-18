import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { MetricCard } from "@/components/shared/metric-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  DollarSign,
  Calendar,
  Plus,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { CycleStatePill } from "@/components/shared/cycle-state-pill";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { formatCents, formatDate, formatDateRange } from "@/lib/utils";
import Link from "next/link";
import { PropertySettings } from "@/components/owner/property-settings";
import { TenantRowActions } from "@/components/owner/tenant-row-actions";
import { UtilityAccountsCard } from "@/components/owner/utility-accounts-card";
import { getUtilityAccountsWithLastBill } from "@/lib/server/utility-accounts";

interface PageProps {
  params: { propertyId: string };
}

export default async function PropertyOverviewPage({ params }: PageProps) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch property
  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", params.propertyId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!property) notFound();

  // Fetch tenants
  const { data: tenants } = await supabase
    .from("property_tenants")
    .select("*")
    .eq("property_id", property.id)
    .order("join_date", { ascending: true });

  const activeTenants = tenants?.filter((t) => t.status === "active") || [];
  const allTenants = tenants || [];

  // Fetch cycles
  const { data: cycles } = await supabase
    .from("billing_cycles")
    .select("*")
    .eq("property_id", property.id)
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  // Fetch bills and total
  const { data: bills } = await supabase
    .from("bills")
    .select("amount_cents")
    .eq("property_id", property.id);

  const totalBilledCents = bills?.reduce((sum, b) => sum + b.amount_cents, 0) || 0;

  const utilityAccounts = await getUtilityAccountsWithLastBill(property.id);
  const openCycleId = cycles?.find((c) => c.status !== "closed")?.id ?? null;

  return (
    <div className="space-y-6">
      <PageHeading
        backHref="/dashboard/owner/properties"
        backLabel="Properties"
        title={property.name}
        description={
          <span className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:mt-1" aria-hidden="true" />
            <span>
              {property.address_line1}
              {property.address_line2 ? `, ${property.address_line2}` : ""},{" "}
              {property.city}, {property.state} {property.zip_code}
            </span>
          </span>
        }
        actions={<PropertySettings property={property} />}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard
          title="Active Tenants"
          value={activeTenants.length}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Total Tenants"
          value={allTenants.length}
          description={`${allTenants.filter((t) => t.status === "departed").length} departed`}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Total Billed"
          value={formatCents(totalBilledCents)}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricCard
          title="Billing Cycles"
          value={cycles?.length || 0}
          icon={<Calendar className="h-4 w-4" />}
        />
      </div>

      <UtilityAccountsCard
        propertyId={property.id}
        accounts={utilityAccounts}
        openCycleId={openCycleId}
      />

      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="cycles">Cycles</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Tenants</h2>
            <Button asChild size="sm">
              <Link
                href={`/dashboard/owner/properties/${property.id}/tenants/invite`}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add Tenant
              </Link>
            </Button>
          </div>

          {allTenants.length > 0 ? (
            <ul className="divide-y rounded-lg border bg-card">
              {allTenants.map((tenant) => (
                <li
                  key={tenant.id}
                  className="flex items-start gap-3 p-3 sm:items-center sm:px-4"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
                  >
                    {tenant.display_name.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{tenant.display_name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {tenant.email}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:gap-3">
                      <span className="text-xs text-muted-foreground sm:text-sm">
                        {formatDate(tenant.join_date)}
                        {tenant.leave_date
                          ? ` – ${formatDate(tenant.leave_date)}`
                          : " – present"}
                      </span>
                      <Badge
                        className="capitalize"
                        variant={
                          tenant.status === "active"
                            ? "success"
                            : tenant.status === "departed"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {tenant.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <TenantRowActions tenant={tenant} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyPanel
              icon={Users}
              title="No tenants yet"
              description="Add your first tenant to get started."
            />
          )}
        </TabsContent>

        <TabsContent value="cycles" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Billing Cycles</h2>
            <Button asChild size="sm">
              <Link
                href={`/dashboard/owner/properties/${property.id}/cycles/new`}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                New Cycle
              </Link>
            </Button>
          </div>

          {cycles && cycles.length > 0 ? (
            <ul className="divide-y rounded-lg border bg-card">
              {cycles.map((cycle) => (
                <li key={cycle.id}>
                  <Link
                    href={`/dashboard/owner/properties/${property.id}/cycles/${cycle.id}`}
                    className="group flex items-center gap-3 p-3 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{cycle.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {cycle.start_date && cycle.end_date
                          ? formatDateRange(cycle.start_date, cycle.end_date)
                          : `Created ${formatDate(cycle.created_at)}`}
                      </p>
                    </div>
                    <CycleStatePill status={cycle.status} />
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyPanel
              icon={Calendar}
              title="No billing cycles yet"
              description="Create one to start adding bills."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
