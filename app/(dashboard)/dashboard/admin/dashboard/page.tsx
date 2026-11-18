import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { requireAdminPage } from "@/lib/server/admin-guard";
import { MetricCard } from "@/components/shared/metric-card";
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
import { Activity, Building2, Mail, Receipt, UserCheck, Users } from "lucide-react";
import { formatCents, formatDate } from "@/lib/utils";
import { getAdminUserGrowth, getAdminBillVolume } from "@/lib/queries/analytics";
import { UserGrowthChart } from "@/components/admin/user-growth-chart";
import { SpendingTrendChart } from "@/components/shared/spending-trend-chart";

const HOUR = 60 * 60 * 1000;
const linkClass =
  "rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function HeartbeatRow({ label, at, staleAfterHours, expect }: { label: string; at: string | null; staleAfterHours: number; expect: string }) {
  const stale = !at || Date.now() - new Date(at).getTime() > staleAfterHours * HOUR;
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{expect}</p>
      </div>
      <div className="text-right">
        <Badge variant={stale ? "destructive" : "secondary"}>{stale ? "Stale" : "OK"}</Badge>
        <p className="mt-1 text-xs text-muted-foreground">
          {at ? formatDistanceToNow(new Date(at), { addSuffix: true }) : "Never"}
        </p>
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdminPage();

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  const [
    { count: userCount },
    { count: ownerCount },
    { count: propertyCount },
    { count: activeTenantCount },
    { data: monthBills },
    { data: pendingInvites },
    { data: heartbeat },
    { data: allBills },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "owner"),
    supabase.from("properties").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("property_tenants").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("bills").select("amount_cents").gte("created_at", monthStart),
    supabase
      .from("property_tenants")
      .select("id, display_name, email, invited_at, invite_expires_at, property_id, properties(name)")
      .is("claimed_at", null)
      .neq("status", "departed")
      .order("invite_expires_at", { ascending: true }),
    supabase.from("app_heartbeat").select("*").eq("id", 1).maybeSingle(),
    supabase.from("bills").select("amount_cents"),
  ]);

  const monthBillCount = monthBills?.length ?? 0;
  const monthBilledCents = (monthBills || []).reduce((sum, b) => sum + b.amount_cents, 0);
  const totalBilledCents = (allBills || []).reduce((sum, b) => sum + b.amount_cents, 0);
  const invites = pendingInvites || [];
  const expiredInvites = invites.filter(
    (i) => i.invite_expires_at && new Date(i.invite_expires_at).getTime() < now.getTime()
  ).length;

  const [userGrowth, billVolume] = await Promise.all([getAdminUserGrowth(), getAdminBillVolume()]);
  const billTrend = billVolume.map((b) => ({ month: b.month, label: b.label, totalCents: b.totalCents }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Pilot health at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard title="Owners" value={ownerCount || 0} description={`${userCount || 0} users in total`} icon={<Users className="h-4 w-4" />} />
        <MetricCard title="Properties" value={propertyCount || 0} icon={<Building2 className="h-4 w-4" />} />
        <MetricCard title="Active tenants" value={activeTenantCount || 0} icon={<UserCheck className="h-4 w-4" />} />
        <MetricCard
          title="Bills this month"
          value={monthBillCount}
          description={`${formatCents(monthBilledCents)} added in ${monthLabel} · ${formatCents(totalBilledCents)} all time`}
          icon={<Receipt className="h-4 w-4" />}
        />
        <MetricCard
          title="Pending invites"
          value={invites.length}
          description={expiredInvites > 0 ? `${expiredInvites} expired` : "None expired"}
          icon={<Mail className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> System heartbeat
            </CardTitle>
            <CardDescription>Keeps the free-tier database awake and runs nightly housekeeping</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {heartbeat ? (
              <>
                <HeartbeatRow
                  label="Nightly cron"
                  at={heartbeat.last_cron_at}
                  staleAfterHours={26}
                  expect="pg_cron, daily at 07:00 UTC"
                />
                <HeartbeatRow
                  label="Keep-alive ping"
                  at={heartbeat.last_ping_at}
                  staleAfterHours={4 * 24}
                  expect="GitHub Actions, every 3 days"
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Heartbeat row not found.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Unclaimed invites</CardTitle>
            <CardDescription>Tenants who haven&apos;t joined yet, soonest expiry first</CardDescription>
          </CardHeader>
          <CardContent>
            {invites.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Invited</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.slice(0, 10).map((i) => {
                      const prop = i.properties as unknown as { name: string } | null;
                      const expired = i.invite_expires_at && new Date(i.invite_expires_at).getTime() < now.getTime();
                      return (
                        <TableRow key={i.id}>
                          <TableCell>
                            <div className="font-medium">{i.display_name}</div>
                            <div className="text-xs text-muted-foreground">{i.email}</div>
                          </TableCell>
                          <TableCell>
                            <Link href={`/dashboard/admin/properties/${i.property_id}`} className={linkClass}>
                              {prop?.name ?? "Property"}
                            </Link>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(i.invited_at)}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {i.invite_expires_at ? (
                              expired ? (
                                <Badge variant="destructive">Expired {formatDate(i.invite_expires_at)}</Badge>
                              ) : (
                                formatDate(i.invite_expires_at)
                              )
                            ) : (
                              <span className="text-muted-foreground">No expiry</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {invites.length > 10 && (
                  <p className="mt-2 text-xs text-muted-foreground">And {invites.length - 10} more.</p>
                )}
              </div>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">Every invite has been claimed.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>New users by month</CardDescription>
          </CardHeader>
          <CardContent>
            <UserGrowthChart data={userGrowth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bill Volume</CardTitle>
            <CardDescription>Monthly billing totals</CardDescription>
          </CardHeader>
          <CardContent>
            <SpendingTrendChart data={billTrend} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
