import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Home, Shield, User } from "lucide-react";
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
import { UserRoleChangeDialog } from "@/components/admin/user-role-change-dialog";
import { CompPlanDialog } from "@/components/admin/comp-plan-dialog";
import { CompStatusBadge } from "@/components/admin/comp-status-badge";
import { AuditLogTable, type AuditPerson } from "@/components/admin/audit-log-table";
import { formatCents, formatDate } from "@/lib/utils";
import { todayUTC } from "@/lib/admin/comp";
import type { AuditLogEntry, TenantStatus, UserRole } from "@/lib/supabase/types";

interface PageProps {
  params: { userId: string };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const roleIcon: Record<UserRole, React.ReactNode> = {
  admin: <Shield className="h-3 w-3" />,
  owner: <Building2 className="h-3 w-3" />,
  tenant: <User className="h-3 w-3" />,
};

const tenantStatusVariant: Record<TenantStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  invited: "secondary",
  departed: "outline",
};

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { supabase, userId: viewerId } = await requireAdminPage();
  if (!UUID_RE.test(params.userId)) notFound();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", params.userId).single();
  if (!profile) notFound();

  const [
    { data: ownedProperties },
    { data: memberships },
    { data: subscriptions },
    { data: plans },
    { data: auditEntries },
  ] = await Promise.all([
    supabase
      .from("properties")
      .select("id, name, city, state, deleted_at, created_at")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("property_tenants")
      .select("id, property_id, display_name, email, status, join_date, leave_date, claimed_at, properties(name)")
      .or(`tenant_id.eq.${profile.id},email.eq."${profile.email}"`)
      .order("join_date", { ascending: false }),
    supabase
      .from("user_subscriptions")
      .select("*, subscription_plans(name, price_cents)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase.from("subscription_plans").select("id, name").eq("is_active", true).order("price_cents"),
    supabase
      .from("audit_log")
      .select("*")
      .or(`record_id.eq.${profile.id},user_id.eq.${profile.id},new_data->>user_id.eq.${profile.id}`)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const ownedIds = (ownedProperties || []).map((p) => p.id);
  const { data: ownedTenants } = ownedIds.length
    ? await supabase.from("property_tenants").select("property_id, status").in("property_id", ownedIds)
    : { data: [] as { property_id: string; status: TenantStatus }[] };

  const activeByProperty: Record<string, number> = {};
  for (const t of ownedTenants || []) {
    if (t.status === "active") activeByProperty[t.property_id] = (activeByProperty[t.property_id] || 0) + 1;
  }

  // Names for audit actors/subjects
  const entries = (auditEntries || []) as AuditLogEntry[];
  const personIds = Array.from(
    new Set(
      entries
        .flatMap((e) => [e.user_id, e.record_id, e.new_data?.user_id as string | undefined])
        .filter((v): v is string => typeof v === "string" && UUID_RE.test(v))
    )
  );
  const { data: people } = personIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", personIds)
    : { data: [] as AuditPerson[] };
  const peopleMap = Object.fromEntries((people || []).map((p) => [p.id, p]));

  const role = profile.role as UserRole;
  const today = todayUTC();
  const activeSub = (subscriptions || []).find((s) => s.status === "active");
  const otherSubs = (subscriptions || []).filter((s) => s !== activeSub);
  const proPlanId = (plans || []).find((p) => p.name === "Pro")?.id;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/admin/users"
          className="inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" /> All users
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{profile.full_name || profile.email}</h1>
          <Badge variant={role === "admin" ? "default" : role === "owner" ? "secondary" : "outline"} className="gap-1">
            {roleIcon[role]}
            {role}
          </Badge>
        </div>
        <p className="text-muted-foreground">{profile.email}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Name</dt>
              <dd>{profile.full_name || "—"}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="break-all">{profile.email}</dd>
              <dt className="text-muted-foreground">Joined</dt>
              <dd>{formatDate(profile.created_at)}</dd>
              <dt className="text-muted-foreground">Onboarding</dt>
              <dd>{profile.onboarding_completed ? "Completed" : "Not completed"}</dd>
              <dt className="text-muted-foreground">User ID</dt>
              <dd className="break-all font-mono text-xs">{profile.id}</dd>
            </dl>
            <div className="mt-4 flex items-center gap-3">
              <UserRoleChangeDialog
                userId={profile.id}
                userName={profile.full_name || profile.email}
                currentRole={role}
                triggerLabel="Change role"
                disabled={profile.id === viewerId}
              />
              {profile.id === viewerId && (
                <span className="text-xs text-muted-foreground">You can&apos;t change your own role.</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Plan and founding / comp status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSub ? (
              <>
                {(() => {
                  const plan = activeSub.subscription_plans as unknown as { name: string; price_cents: number } | null;
                  return (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-semibold">{plan?.name ?? "Unknown plan"}</span>
                        <span className="text-sm text-muted-foreground">
                          {plan ? `${formatCents(plan.price_cents)}/month list price` : null}
                        </span>
                      </div>
                      <CompStatusBadge planName={plan?.name ?? "Plan"} compUntil={activeSub.comp_until} today={today} />
                      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">Status</dt>
                        <dd>{activeSub.status}</dd>
                        <dt className="text-muted-foreground">Started</dt>
                        <dd>{formatDate(activeSub.current_period_start ?? activeSub.created_at)}</dd>
                        <dt className="text-muted-foreground">Note</dt>
                        <dd>{activeSub.comp_note || "—"}</dd>
                      </dl>
                    </>
                  );
                })()}
                <CompPlanDialog
                  mode="extend"
                  subscriptionId={activeSub.id}
                  currentCompUntil={activeSub.comp_until ?? null}
                  currentNote={activeSub.comp_note ?? null}
                />
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">No active subscription.</p>
                {role === "owner" ? (
                  <CompPlanDialog mode="grant" userId={profile.id} plans={plans || []} defaultPlanId={proPlanId} />
                ) : (
                  <p className="text-xs text-muted-foreground">Plans can be granted to owners only.</p>
                )}
              </>
            )}
            {otherSubs.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {otherSubs.length} past subscription{otherSubs.length === 1 ? "" : "s"} (
                {otherSubs.map((s) => s.status).join(", ")})
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {(role === "owner" || (ownedProperties || []).length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Properties owned ({(ownedProperties || []).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(ownedProperties || []).length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Active tenants</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(ownedProperties || []).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/admin/properties/${p.id}`}
                            className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {p.name}
                          </Link>
                          {p.deleted_at && (
                            <Badge variant="outline" className="ml-2">
                              Deleted
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.city}, {p.state}
                        </TableCell>
                        <TableCell>{activeByProperty[p.id] || 0}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">No properties yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" /> Tenancies ({(memberships || []).length})
          </CardTitle>
          <CardDescription>Properties this person lives in or was invited to (matched by account or email)</CardDescription>
        </CardHeader>
        <CardContent>
          {(memberships || []).length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stay</TableHead>
                    <TableHead>Claimed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(memberships || []).map((m) => {
                    const prop = m.properties as unknown as { name: string } | null;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/admin/properties/${m.property_id}`}
                            className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {prop?.name ?? "Property"}
                          </Link>
                          <div className="text-xs text-muted-foreground">as {m.display_name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={tenantStatusVariant[m.status as TenantStatus]}>{m.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(m.join_date)} – {m.leave_date ? formatDate(m.leave_date) : "now"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {m.claimed_at ? formatDate(m.claimed_at) : "Not yet"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">No tenancies.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent admin activity</CardTitle>
          <CardDescription>Audit entries by or about this user</CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogTable entries={entries} people={peopleMap} emptyMessage="No audit entries for this user." />
          <Link
            href={`/dashboard/admin/audit-log?actor=${profile.id}`}
            className="mt-3 inline-block rounded-sm text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            See all actions by this user
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
