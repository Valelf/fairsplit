import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Calendar, Shield } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function TenantSettingsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Get tenant's property memberships
  const { data: memberships } = await supabase
    .from("property_tenants")
    .select("*, properties(name, city, state)")
    .eq("tenant_id", user.id)
    .order("join_date", { ascending: false });

  const allMemberships = memberships || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Your account information
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">
                Name
              </label>
              <p className="text-sm">{profile.full_name}</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Email
              </label>
              <p className="text-sm">{profile.email}</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Role
              </label>
              <Badge variant="outline" className="capitalize">
                {profile.role}
              </Badge>
            </div>
            <Separator />
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Member since
              </label>
              <p className="text-sm">{formatDate(profile.created_at)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Property Memberships</CardTitle>
            <CardDescription>Properties you are or were a member of</CardDescription>
          </CardHeader>
          <CardContent>
            {allMemberships.length > 0 ? (
              <div className="space-y-3">
                {allMemberships.map((m) => {
                  const property = m.properties as unknown as { name: string; city: string; state: string } | null;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{property?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {property?.city}, {property?.state}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Joined {formatDate(m.join_date)}
                          {m.leave_date && ` · Left ${formatDate(m.leave_date)}`}
                        </p>
                      </div>
                      <Badge
                        variant={m.status === "active" ? "secondary" : "outline"}
                        className="capitalize"
                      >
                        {m.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No property memberships yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
