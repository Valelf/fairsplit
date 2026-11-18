import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminPage } from "@/lib/server/admin-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents, formatDate, formatDateRange } from "@/lib/utils";
import type { TenantStatus } from "@/lib/supabase/types";

interface PageProps {
  params: { propertyId: string };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const linkClass =
  "rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const tenantStatusVariant: Record<TenantStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  invited: "secondary",
  departed: "outline",
};

export default async function AdminPropertyDetailPage({ params }: PageProps) {
  const { supabase } = await requireAdminPage();
  if (!UUID_RE.test(params.propertyId)) notFound();

  const { data: property } = await supabase
    .from("properties")
    .select("*, profiles!properties_owner_id_fkey(id, full_name, email)")
    .eq("id", params.propertyId)
    .single();
  if (!property) notFound();

  const [{ data: tenants }, { data: cycles }, { data: bills }] = await Promise.all([
    supabase
      .from("property_tenants")
      .select("*")
      .eq("property_id", property.id)
      .order("join_date", { ascending: true }),
    supabase
      .from("billing_cycles")
      .select("id, label, status, start_date, end_date, created_at")
      .eq("property_id", property.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("bills")
      .select("id, category, provider, amount_cents, service_start, service_end, created_at, cycle_id")
      .eq("property_id", property.id)
      .order("service_end", { ascending: false })
      .limit(20),
  ]);

  const owner = property.profiles as unknown as { id: string; full_name: string; email: string } | null;
  const cycleLabel = Object.fromEntries((cycles || []).map((c) => [c.id, c.label]));
  const now = Date.now();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/admin/properties" className={`inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground ${linkClass}`}>
          <ArrowLeft className="h-4 w-4" /> All properties
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{property.name}</h1>
          {property.deleted_at && <Badge variant="outline">Deleted {formatDate(property.deleted_at)}</Badge>}
        </div>
        <p className="text-muted-foreground">
          {property.address_line1}
          {property.address_line2 ? `, ${property.address_line2}` : ""}, {property.city}, {property.state}{" "}
          {property.zip_code}
        </p>
        <p className="mt-1 text-sm">
          Owner:{" "}
          {owner ? (
            <Link href={`/dashboard/admin/users/${owner.id}`} className={`font-medium ${linkClass}`}>
              {owner.full_name || owner.email}
            </Link>
          ) : (
            "—"
          )}
          <span className="text-muted-foreground"> · {property.transparency_level === "full" ? "Full transparency" : "Own share only"}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenants ({(tenants || []).length})</CardTitle>
        </CardHeader>
        <CardContent>
          {(tenants || []).length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stay</TableHead>
                    <TableHead>Invite</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tenants || []).map((t) => {
                    const expired = !t.claimed_at && t.invite_expires_at && new Date(t.invite_expires_at).getTime() < now;
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          {t.tenant_id ? (
                            <Link href={`/dashboard/admin/users/${t.tenant_id}`} className={`font-medium ${linkClass}`}>
                              {t.display_name}
                            </Link>
                          ) : (
                            <span className="font-medium">{t.display_name}</span>
                          )}
                          <div className="text-xs text-muted-foreground">{t.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={tenantStatusVariant[t.status as TenantStatus]}>{t.status}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(t.join_date)} – {t.leave_date ? formatDate(t.leave_date) : "now"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {t.claimed_at ? (
                            <span className="text-muted-foreground">Claimed {formatDate(t.claimed_at)}</span>
                          ) : expired ? (
                            <Badge variant="destructive">Expired {formatDate(t.invite_expires_at!)}</Badge>
                          ) : t.invite_expires_at ? (
                            <span>Unclaimed · expires {formatDate(t.invite_expires_at)}</span>
                          ) : (
                            <span className="text-muted-foreground">Unclaimed</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">No tenants yet.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Billing cycles ({(cycles || []).length})</CardTitle>
          </CardHeader>
          <CardContent>
            {(cycles || []).length > 0 ? (
              <ul className="space-y-2 text-sm">
                {(cycles || []).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <span>{c.label}</span>
                    <Badge variant={c.status === "open" ? "default" : c.status === "closed" ? "outline" : "secondary"}>
                      {c.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No cycles yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent bills</CardTitle>
            <CardDescription>Latest 20 by service period</CardDescription>
          </CardHeader>
          <CardContent>
            {(bills || []).length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill</TableHead>
                      <TableHead>Service period</TableHead>
                      <TableHead>Cycle</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(bills || []).map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>
                          <div className="font-medium">{b.provider}</div>
                          <div className="text-xs capitalize text-muted-foreground">{b.category}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDateRange(b.service_start, b.service_end)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{cycleLabel[b.cycle_id] ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCents(b.amount_cents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No bills yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
