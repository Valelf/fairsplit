import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { MetricCard } from "@/components/shared/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  Receipt,
  DollarSign,
  Calendar,
  Plus,
  MapPin,
} from "lucide-react";
import { formatCents } from "@/lib/utils";
import Link from "next/link";

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
    .order("created_at", { ascending: false });

  // Fetch bills and total
  const { data: bills } = await supabase
    .from("bills")
    .select("amount_cents")
    .eq("property_id", property.id);

  const totalBilledCents = bills?.reduce((sum, b) => sum + b.amount_cents, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/owner/properties">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {property.name}
          </h1>
          <p className="text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {property.address_line1}, {property.city}, {property.state}{" "}
            {property.zip_code}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="cycles">Cycles</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tenants</h2>
            <Button asChild size="sm">
              <Link
                href={`/dashboard/owner/properties/${property.id}/tenants/invite`}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Tenant
              </Link>
            </Button>
          </div>

          {allTenants.length > 0 ? (
            <div className="space-y-2">
              {allTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{tenant.display_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {tenant.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {tenant.join_date}
                      {tenant.leave_date && ` – ${tenant.leave_date}`}
                    </span>
                    <Badge
                      variant={
                        tenant.status === "active"
                          ? "default"
                          : tenant.status === "departed"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {tenant.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-8">
                <Users className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No tenants yet. Add your first tenant to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cycles" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Billing Cycles</h2>
            <Button asChild size="sm">
              <Link
                href={`/dashboard/owner/properties/${property.id}/cycles/new`}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Cycle
              </Link>
            </Button>
          </div>

          {cycles && cycles.length > 0 ? (
            <div className="space-y-2">
              {cycles.map((cycle) => (
                <Link
                  key={cycle.id}
                  href={`/dashboard/owner/properties/${property.id}/cycles/${cycle.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
                >
                  <div>
                    <p className="font-medium">{cycle.label}</p>
                    <p className="text-sm text-muted-foreground">
                      Created{" "}
                      {new Date(cycle.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      cycle.status === "closed"
                        ? "secondary"
                        : cycle.status === "open"
                          ? "default"
                          : "outline"
                    }
                  >
                    {cycle.status}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-8">
                <Calendar className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No billing cycles yet. Create one to start adding bills.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
