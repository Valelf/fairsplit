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
import { Users, Shield, Building2, User } from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/lib/supabase/types";
import { UserRoleChangeDialog } from "@/components/admin/user-role-change-dialog";

const roleBadgeVariant: Record<UserRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  owner: "secondary",
  tenant: "outline",
};

const roleIcon: Record<UserRole, React.ReactNode> = {
  admin: <Shield className="h-3 w-3" />,
  owner: <Building2 className="h-3 w-3" />,
  tenant: <User className="h-3 w-3" />,
};

export default async function AdminUsersPage() {
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

  // Fetch all users
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  const allUsers = users || [];
  const adminCount = allUsers.filter((u) => u.role === "admin").length;
  const ownerCount = allUsers.filter((u) => u.role === "owner").length;
  const tenantCount = allUsers.filter((u) => u.role === "tenant").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Manage all platform users
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
          <CardTitle>All Users ({allUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {allUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.full_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant[u.role as UserRole]} className="gap-1">
                        {roleIcon[u.role as UserRole]}
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(u.created_at)}
                    </TableCell>
                    <TableCell>
                      <UserRoleChangeDialog
                        userId={u.id}
                        userName={u.full_name}
                        currentRole={u.role as UserRole}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No users found.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
