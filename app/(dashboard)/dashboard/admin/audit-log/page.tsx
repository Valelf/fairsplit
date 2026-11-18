import Link from "next/link";
import { requireAdminPage } from "@/lib/server/admin-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditLogTable, type AuditPerson } from "@/components/admin/audit-log-table";
import { AuditLogFilters } from "@/components/admin/audit-log-filters";
import { getAuditLog } from "@/lib/actions/admin";
import { auditActionLabel } from "@/lib/admin/audit-format";
import { cn } from "@/lib/utils";
import { PageHeading } from "@/components/layout/page-heading";

interface PageProps {
  searchParams: { page?: string; action?: string; actor?: string };
}

const PAGE_SIZE = 25;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AuditLogPage({ searchParams }: PageProps) {
  const { supabase } = await requireAdminPage();

  const page = Math.max(1, parseInt(searchParams.page || "1") || 1);
  const action = searchParams.action || undefined;
  const actor = searchParams.actor && UUID_RE.test(searchParams.actor) ? searchParams.actor : undefined;

  const [{ data: entries, total }, { data: facetRows }] = await Promise.all([
    getAuditLog({ page, pageSize: PAGE_SIZE, action, actorId: actor }),
    // Small table during the pilot: fetch facets directly.
    supabase.from("audit_log").select("action, user_id").limit(5000),
  ]);

  const actionValues = Array.from(new Set((facetRows || []).map((r) => r.action))).sort();
  const actorIds = Array.from(new Set((facetRows || []).map((r) => r.user_id).filter((v): v is string => !!v)));

  // Profiles for actors + subjects shown on this page
  const subjectIds = entries.flatMap((e) => [e.user_id, e.record_id, e.new_data?.user_id as string | undefined]);
  const personIds = Array.from(
    new Set([...actorIds, ...subjectIds].filter((v): v is string => typeof v === "string" && UUID_RE.test(v)))
  );
  const { data: people } = personIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", personIds)
    : { data: [] as AuditPerson[] };
  const peopleMap: Record<string, AuditPerson> = Object.fromEntries((people || []).map((p) => [p.id, p]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (actor) params.set("actor", actor);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/dashboard/admin/audit-log${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <PageHeading title="Audit log" description="Every administrative action on the platform" />

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="flex flex-wrap items-baseline gap-2">
            Activity
            <span className="figure text-sm font-normal text-muted-foreground">
              {total} {total === 1 ? "entry" : "entries"}
            </span>
          </CardTitle>
          <AuditLogFilters
            actions={actionValues.map((a) => ({ value: a, label: auditActionLabel(a) }))}
            actors={actorIds.map((id) => ({
              value: id,
              label: peopleMap[id]?.full_name || peopleMap[id]?.email || id.slice(0, 8),
            }))}
          />
        </CardHeader>
        <CardContent>
          <AuditLogTable entries={entries} people={peopleMap} />
          {totalPages > 1 && (
            <nav aria-label="Audit log pages" className="mt-4 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Previous
                </Link>
              )}
              <span className="figure text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={pageHref(page + 1)}
                  className={cn(
                    "inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                >
                  Next
                </Link>
              )}
            </nav>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
