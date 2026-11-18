import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Calendar, Shield, Home } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { formatDate } from "@/lib/utils";
import { EmailRemindersToggle } from "@/components/shared/email-reminders-toggle";

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

  const fields = [
    { icon: User, label: "Name", value: profile.full_name },
    { icon: Mail, label: "Email", value: profile.email },
    {
      icon: Shield,
      label: "Role",
      value: (
        <Badge variant="outline" className="capitalize">
          {profile.role}
        </Badge>
      ),
    },
    { icon: Calendar, label: "Member since", value: formatDate(profile.created_at) },
  ];

  return (
    <div className="space-y-6">
      <PageHeading title="Settings" description="Your account and the homes you've belonged to." />

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="divide-y">
              {fields.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </dt>
                  <dd className="min-w-0 truncate text-right text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <EmailRemindersToggle enabled={profile.email_reminders ?? true} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Home memberships</CardTitle>
            <CardDescription>Homes you live in now or lived in before</CardDescription>
          </CardHeader>
          <CardContent>
            {allMemberships.length > 0 ? (
              <ul className="space-y-2">
                {allMemberships.map((m) => {
                  const property = m.properties as unknown as { name: string; city: string; state: string } | null;
                  return (
                    <li
                      key={m.id}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{property?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {property?.city}, {property?.state}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Joined {formatDate(m.join_date)}
                          {m.leave_date && `, left ${formatDate(m.leave_date)}`}
                        </p>
                      </div>
                      <Badge
                        variant={m.status === "active" ? "success" : "secondary"}
                        className="capitalize"
                      >
                        {m.status}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyPanel
                icon={Home}
                title="No memberships yet"
                description="Homes you join through an invite link appear here."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
