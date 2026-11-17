import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MetricCard } from "@/components/shared/metric-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Receipt, DollarSign } from "lucide-react";
import { formatCents } from "@/lib/utils";
import { getAdminUserGrowth, getAdminBillVolume } from "@/lib/queries/analytics";
import { UserGrowthChart } from "@/components/admin/user-growth-chart";
import { SpendingTrendChart } from "@/components/shared/spending-trend-chart";

export default async function AdminDashboardPage() {
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

  // Platform stats
  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: propertyCount } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null);

  const { count: billCount } = await supabase
    .from("bills")
    .select("*", { count: "exact", head: true });

  const { data: allBills } = await supabase
    .from("bills")
    .select("amount_cents");

  const totalBilledCents = allBills?.reduce((sum, b) => sum + b.amount_cents, 0) || 0;

  // Analytics
  const userGrowth = await getAdminUserGrowth();
  const billVolume = await getAdminBillVolume();
  const billTrend = billVolume.map((b) => ({
    month: b.month,
    label: b.label,
    totalCents: b.totalCents,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Platform-wide analytics and management
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={userCount || 0}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Properties"
          value={propertyCount || 0}
          icon={<Building2 className="h-4 w-4" />}
        />
        <MetricCard
          title="Bills Processed"
          value={billCount || 0}
          icon={<Receipt className="h-4 w-4" />}
        />
        <MetricCard
          title="Total Billed"
          value={formatCents(totalBilledCents)}
          icon={<DollarSign className="h-4 w-4" />}
        />
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
