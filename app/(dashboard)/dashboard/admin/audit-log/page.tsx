import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditLogTable } from "@/components/admin/audit-log-table";
import { getAuditLog } from "@/lib/actions/admin";

interface PageProps {
  searchParams: { page?: string };
}

export default async function AuditLogPage({ searchParams }: PageProps) {
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

  const page = parseInt(searchParams.page || "1");
  const { data: entries, total } = await getAuditLog({ page, pageSize: 20 });

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Track all administrative actions on the platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Activity Log ({total} {total === 1 ? "entry" : "entries"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AuditLogTable entries={entries} />
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <a
                    key={p}
                    href={`/dashboard/admin/audit-log?page=${p}`}
                    className={`px-3 py-1 rounded text-sm ${
                      p === page
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    }`}
                  >
                    {p}
                  </a>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
