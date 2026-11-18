import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, ChevronRight, MapPin } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { EmptyPanel } from "@/components/shared/empty-panel";
import Link from "next/link";

export default async function TenantPropertiesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: tenantRecords } = await supabase
    .from("property_tenants")
    .select("*, properties(*)")
    .eq("tenant_id", user.id)
    .in("status", ["active", "departed"]);

  const properties = tenantRecords?.map((r: any) => ({
    ...r.properties,
    tenantStatus: r.status,
  })).filter(Boolean) || [];

  return (
    <div className="space-y-6">
      <PageHeading
        title="My homes"
        description="Places you rent a room in. Open one for its bills."
      />

      {properties.length > 0 ? (
        <ul className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property: any) => (
            <li key={property.id}>
              <Link
                href={`/dashboard/tenant/properties/${property.id}/bills`}
                className="group block rounded-xl"
              >
                <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-accent/40">
                  <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
                    <div className="min-w-0 space-y-1">
                      <h2 className="truncate text-lg font-semibold">{property.name}</h2>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          {property.city}, {property.state}
                        </span>
                      </p>
                    </div>
                    <ChevronRight
                      className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyPanel
          icon={Building2}
          title="No homes yet"
          description="Ask your landlord to send you an invite link. Your bills show up here once you join."
        />
      )}
    </div>
  );
}
