import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, MapPin } from "lucide-react";
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Properties</h1>
        <p className="text-muted-foreground">
          Properties you are a tenant in
        </p>
      </div>

      {properties.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property: any) => (
            <Link
              key={property.id}
              href={`/dashboard/tenant/properties/${property.id}/bills`}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{property.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>
                          {property.city}, {property.state}
                        </span>
                      </div>
                    </div>
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No properties yet</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              You haven&apos;t been added to any properties. Ask your landlord to
              send you an invite.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
