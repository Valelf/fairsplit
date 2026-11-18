import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeading } from "@/components/layout/page-heading";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { PaymentLedgerTable } from "@/components/owner/payment-ledger-table";
import { createClient } from "@/lib/supabase/server";
import { getOwnerPaymentLedger } from "@/lib/queries/payments";
import { PAYMENT_STATUS_LABELS, type DisplayPaymentStatus } from "@/lib/payments";
import { cn, formatCents } from "@/lib/utils";

interface PageProps {
  searchParams: { property?: string; status?: string };
}

const STATUS_FILTERS: (DisplayPaymentStatus | "all" | "unpaid")[] = [
  "all",
  "unpaid",
  "overdue",
  "marked_paid",
  "confirmed",
];

function filterLabel(f: (typeof STATUS_FILTERS)[number]) {
  if (f === "all") return "All";
  if (f === "unpaid") return "Not confirmed";
  return PAYMENT_STATUS_LABELS[f];
}

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

export default async function OwnerPaymentsPage({ searchParams }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const propertyFilter = searchParams.property;
  const statusFilter = STATUS_FILTERS.includes(searchParams.status as never)
    ? (searchParams.status as (typeof STATUS_FILTERS)[number])
    : "all";

  const { properties, rows } = await getOwnerPaymentLedger({ propertyId: propertyFilter });

  const collected = rows.reduce((s, r) => s + r.summary.confirmedCents, 0);
  const awaiting = rows.reduce((s, r) => s + r.summary.markedPaidCents, 0);
  const owed = rows.reduce((s, r) => s + r.summary.owedCents, 0);
  const overdueRows = rows.filter((r) => r.status === "overdue");
  const overdueCents = overdueRows.reduce((s, r) => s + r.summary.owedCents, 0);

  const visible = rows.filter((r) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "unpaid") return r.status !== "confirmed";
    return r.status === statusFilter;
  });

  const href = (p: string | undefined, st: string) => {
    const params = new URLSearchParams();
    if (p) params.set("property", p);
    if (st !== "all") params.set("status", st);
    const q = params.toString();
    return `/dashboard/owner/payments${q ? `?${q}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Payments"
        description="Who has paid, across your properties. Tenants pay you directly; confirm when the money arrives."
      />

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <MetricCard title="Collected" value={formatCents(collected)} description="Confirmed by you" tone="positive" icon={<CheckCircle2 className="h-4 w-4" />} />
        <MetricCard title="Awaiting" value={formatCents(awaiting)} description="Marked paid by tenants" tone="info" icon={<Clock className="h-4 w-4" />} />
        <MetricCard title="Outstanding" value={formatCents(owed)} description="Not yet paid" tone={owed > 0 ? "attention" : "default"} icon={<Wallet className="h-4 w-4" />} />
        <MetricCard
          title="Overdue"
          tone={overdueCents > 0 ? "negative" : "default"}
          value={formatCents(overdueCents)}
          description={`${overdueRows.length} ${overdueRows.length === 1 ? "share" : "shares"} past due`}
          icon={<AlertCircle className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="space-y-1">
            <CardTitle className="font-display text-lg">Ledger</CardTitle>
            <CardDescription>One row per tenant per billing cycle.</CardDescription>
          </div>
          {properties.length > 1 && (
            <nav aria-label="Filter by property" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
              <FilterChip href={href(undefined, statusFilter)} active={!propertyFilter}>
                All properties
              </FilterChip>
              {properties.map((p) => (
                <FilterChip key={p.id} href={href(p.id, statusFilter)} active={propertyFilter === p.id}>
                  {p.name}
                </FilterChip>
              ))}
            </nav>
          )}
          <nav aria-label="Filter by status" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
            {STATUS_FILTERS.map((f) => (
              <FilterChip key={f} href={href(propertyFilter, f)} active={statusFilter === f}>
                {filterLabel(f)}
              </FilterChip>
            ))}
          </nav>
        </CardHeader>
        <CardContent>
          {visible.length > 0 ? (
            <PaymentLedgerTable rows={visible} showProperty={!propertyFilter && properties.length > 1} />
          ) : (
            <EmptyPanel
              icon={Wallet}
              title={rows.length === 0 ? "No tenant shares yet" : "Nothing matches this filter"}
              description={
                rows.length === 0
                  ? "Once a cycle has bills, each tenant's share shows up here."
                  : "Try another status or property."
              }
              action={
                rows.length > 0 ? (
                  <Link
                    href={href(undefined, "all")}
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Clear filters
                  </Link>
                ) : undefined
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
