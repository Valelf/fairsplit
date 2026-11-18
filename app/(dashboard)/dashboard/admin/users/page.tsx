import Link from "next/link";
import { requireAdminPage } from "@/lib/server/admin-guard";
import { CompStatusBadge } from "@/components/admin/comp-status-badge";
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
import { Users, Shield, Building2, User } from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/lib/supabase/types";
import { UserRoleChangeDialog } from "@/components/admin/user-role-change-dialog";
import { PageHeading } from "@/components/layout/page-heading";
import { EmptyPanel } from "@/components/shared/empty-panel";
import type { BadgeProps } from "@/components/ui/badge";

const roleBadgeVariant: Record<UserRole, BadgeProps["variant"]> = {
  admin: "info",
  owner: "success",
  tenant: "secondary",
};

const roleIcon: Record<UserRole, React.ReactNode> = {
  admin: <Shield className="h-3 w-3" aria-hidden="true" />,
  owner: <Building2 className="h-3 w-3" aria-hidden="true" />,
  tenant: <User className="h-3 w-3" aria-hidden="true" />,
};

export default async function AdminUsersPage() {
  const { supabase, userId: viewerId } = await requireAdminPage();

  // Fetch all users and their active subscriptions
  const [{ data: users }, { data: subs }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: true }),
    supabase
      .from("user_subscriptions")
      .select("user_id, comp_until, subscription_plans(name)")
      .eq("status", "active"),
  ]);
  const subByUser = new Map((subs || []).map((s) => [s.user_id, s]));

  const allUsers = users || [];
  const adminCount = allUsers.filter((u) => u.role === "admin").length;
  const ownerCount = allUsers.filter((u) => u.role === "owner").length;
  const tenantCount = allUsers.filter((u) => u.role === "tenant").length;

  return (
    <div className="space-y-6">
      <PageHeading title="Users" description="Manage all platform users" />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <MetricCard
          title="Admins"
          value={adminCount}
          icon={<Shield className="h-4 w-4" />}
        />
        <MetricCard
          title="Owners"
          value={ownerCount}
          icon={<Building2 className="h-4 w-4" />}
        />
        <MetricCard
          title="Tenants"
          value={tenantCount}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-baseline gap-2">
            All users
            <span className="figure text-sm font-normal text-muted-foreground">{allUsers.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allUsers.length > 0 ? (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-16"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUsers.map((u) => {
                  const sub = subByUser.get(u.id);
                  const planName =
                    (sub?.subscription_plans as unknown as { name: string } | null)?.name ?? "Plan";
                  return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/admin/users/${u.id}`}
                        className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {u.full_name || u.email}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant[u.role as UserRole]} className="gap-1 capitalize">
                        {roleIcon[u.role as UserRole]}
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sub ? (
                        <CompStatusBadge planName={planName} compUntil={sub.comp_until} />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {u.role === "owner" ? "No plan" : "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(u.created_at)}
                    </TableCell>
                    <TableCell>
                      <UserRoleChangeDialog
                        userId={u.id}
                        userName={u.full_name}
                        currentRole={u.role as UserRole}
                        disabled={u.id === viewerId}
                      />
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          ) : (
            <EmptyPanel icon={Users} title="No users yet" description="People appear here once they sign up or claim an invite." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
