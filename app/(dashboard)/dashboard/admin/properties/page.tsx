import Link from "next/link";
import { requireAdminPage } from "@/lib/server/admin-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { PageHeading } from "@/components/layout/page-heading";
import { EmptyPanel } from "@/components/shared/empty-panel";

const linkClass =
  "rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function AdminPropertiesPage() {
  const { supabase } = await requireAdminPage();

  const [{ data: properties }, { data: tenantRows }, { data: billRows }] = await Promise.all([
    supabase
      .from("properties")
      .select("*, profiles!properties_owner_id_fkey(id, full_name, email)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("property_tenants").select("property_id, status"),
    supabase.from("bills").select("property_id, service_end, created_at"),
  ]);

  const counts: Record<string, { active: number; invited: number; departed: number }> = {};
  for (const t of tenantRows || []) {
    const c = (counts[t.property_id] ??= { active: 0, invited: 0, departed: 0 });
    c[t.status as "active" | "invited" | "departed"] += 1;
  }

  const lastBill: Record<string, { serviceEnd: string; added: string; count: number }> = {};
  for (const b of billRows || []) {
    const cur = lastBill[b.property_id];
    if (!cur) lastBill[b.property_id] = { serviceEnd: b.service_end, added: b.created_at, count: 1 };
    else {
      cur.count += 1;
      if (b.service_end > cur.serviceEnd) cur.serviceEnd = b.service_end;
      if (b.created_at > cur.added) cur.added = b.created_at;
    }
  }

  const allProperties = properties || [];

  return (
    <div className="space-y-6">
      <PageHeading title="Properties" description="All properties on the platform" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
            All properties
            <span className="figure text-sm font-normal text-muted-foreground">{allProperties.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allProperties.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Tenants</TableHead>
                    <TableHead className="text-right">Bills</TableHead>
                    <TableHead>Last bill</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allProperties.map((property) => {
                    const owner = property.profiles as unknown as {
                      id: string;
                      full_name: string;
                      email: string;
                    } | null;
                    const c = counts[property.id] ?? { active: 0, invited: 0, departed: 0 };
                    const lb = lastBill[property.id];

                    return (
                      <TableRow key={property.id}>
                        <TableCell>
                          <Link href={`/dashboard/admin/properties/${property.id}`} className={`font-medium ${linkClass}`}>
                            {property.name}
                          </Link>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" aria-hidden="true" />
                            {property.city}, {property.state}
                          </div>
                        </TableCell>
                        <TableCell>
                          {owner ? (
                            <Link href={`/dashboard/admin/users/${owner.id}`} className={linkClass}>
                              <span className="text-sm font-medium">{owner.full_name}</span>
                            </Link>
                          ) : (
                            "—"
                          )}
                          <p className="text-xs text-muted-foreground">{owner?.email}</p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          <span className="figure">{c.active}</span> active
                          <div className="text-xs text-muted-foreground">
                            <span className="figure">{c.invited}</span> invited, <span className="figure">{c.departed}</span> departed
                          </div>
                        </TableCell>
                        <TableCell className="figure text-right">{lb?.count ?? 0}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {lb ? (
                            <>
                              {formatDate(lb.serviceEnd)}
                              <div className="text-xs text-muted-foreground">added {formatDate(lb.added)}</div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">None yet</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(property.created_at)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyPanel icon={Building2} title="No properties yet" description="Properties appear here as soon as an owner adds one." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
