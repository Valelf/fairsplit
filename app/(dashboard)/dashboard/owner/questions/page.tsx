import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, MessageCircleQuestion } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { QuestionStatusPill } from "@/components/shared/question-status-pill";
import { createClient } from "@/lib/supabase/server";
import { getOwnerQuestions } from "@/lib/queries/questions";
import { previewText } from "@/lib/questions/helpers";
import { cn, formatCents } from "@/lib/utils";

interface PageProps {
  searchParams: { property?: string; show?: string };
}

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {children}
    </Link>
  );
}

export default async function OwnerQuestionsPage({ searchParams }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const show = searchParams.show === "resolved" ? "resolved" : "unresolved";
  const propertyFilter = searchParams.property;
  const { properties, rows } = await getOwnerQuestions({ show, propertyId: propertyFilter });
  const needsReply = rows.filter((r) => r.status === "open").length;

  const href = (p: string | undefined, s: string) => {
    const params = new URLSearchParams();
    if (p) params.set("property", p);
    if (s === "resolved") params.set("show", "resolved");
    const q = params.toString();
    return `/dashboard/owner/questions${q ? `?${q}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Questions"
        description="Tenants asking about a bill. Reply, or resolve and correct the amount if it was wrong."
      />

      <Card>
        <CardHeader className="space-y-4">
          <div className="space-y-1">
            <CardTitle className="font-display text-lg">
              {show === "resolved" ? "Resolved" : "Open conversations"}
            </CardTitle>
            <CardDescription>
              {show === "resolved"
                ? "Questions you have closed."
                : needsReply > 0
                  ? `${needsReply} ${needsReply === 1 ? "question needs" : "questions need"} a reply.`
                  : "You're all caught up."}
            </CardDescription>
          </div>
          {properties.length > 1 && (
            <nav aria-label="Filter by property" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
              <FilterChip href={href(undefined, show)} active={!propertyFilter}>
                All properties
              </FilterChip>
              {properties.map((p) => (
                <FilterChip key={p.id} href={href(p.id, show)} active={propertyFilter === p.id}>
                  {p.name}
                </FilterChip>
              ))}
            </nav>
          )}
          <nav aria-label="Filter by status" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
            <FilterChip href={href(propertyFilter, "unresolved")} active={show === "unresolved"}>
              Open
            </FilterChip>
            <FilterChip href={href(propertyFilter, "resolved")} active={show === "resolved"}>
              Resolved
            </FilterChip>
          </nav>
        </CardHeader>
        <CardContent>
          {rows.length > 0 ? (
            <ul className="divide-y rounded-lg border">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/dashboard/owner/questions/${r.id}`}
                    className="flex items-start gap-3 px-3 py-3 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium">{r.tenantName}</span>
                        <QuestionStatusPill status={r.status} viewer="owner" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <span className="capitalize">{r.bill.category}</span> · {r.bill.provider} ·{" "}
                        <span className="figure">{formatCents(r.bill.amount_cents)}</span>
                        {properties.length > 1 && !propertyFilter ? ` · ${r.propertyName}` : ""}
                      </p>
                      {r.lastMessage && (
                        <p className="line-clamp-2 text-sm">
                          {!r.lastMessage.fromTenant && <span className="text-muted-foreground">You: </span>}
                          {previewText(r.lastMessage.body, 180)}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <time dateTime={r.updated_at}>{dateFormat.format(new Date(r.updated_at))}</time>
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyPanel
              icon={MessageCircleQuestion}
              title={show === "resolved" ? "No resolved questions" : "No open questions"}
              description={
                show === "resolved"
                  ? "Questions you resolve are kept here."
                  : "When a tenant asks about a bill, the conversation shows up here."
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
