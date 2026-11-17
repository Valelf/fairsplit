import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, MapPin, Users } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function AdminPropertiesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/login");

  // Fetch all properties with owner info
  const { data: properties } = await supabase
    .from("properties")
    .select("*, profiles!properties_owner_id_fkey(full_name, email)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Fetch tenant counts per property
  const { data: tenantCounts } = await supabase
    .from("property_tenants")
    .select("property_id, status");

  const activeTenantsByProperty = (tenantCounts || []).reduce<Record<string, number>>(
    (acc, t) => {
      if (t.status === "active") {
        acc[t.property_id] = (acc[t.property_id] || 0) + 1;
      }
      return acc;
    },
    {}
  );

  const allProperties = properties || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
        <p className="text-muted-foreground">
          All properties on the platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            All Properties ({allProperties.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allProperties.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Tenants</TableHead>
                  <TableHead>Transparency</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allProperties.map((property) => {
                  const owner = property.profiles as unknown as { full_name: string; email: string } | null;
                  const tenantCount = activeTenantsByProperty[property.id] || 0;

                  return (
                    <TableRow key={property.id}>
                      <TableCell className="font-medium">
                        {property.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {property.city}, {property.state} {property.zip_code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{owner?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{owner?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{tenantCount} active</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={property.transparency_level === "full" ? "secondary" : "outline"}>
                          {property.transparency_level === "full" ? "Full" : "Own share"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(property.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No properties found.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
