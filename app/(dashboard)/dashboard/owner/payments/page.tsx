import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/shared/metric-card";
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
        "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">
          Who has paid, across your properties. Tenants pay you directly; confirm when the money arrives.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Collected" value={formatCents(collected)} description="Confirmed by you" icon={<CheckCircle2 className="h-4 w-4" />} />
        <MetricCard title="Awaiting confirmation" value={formatCents(awaiting)} description="Tenants marked these paid" icon={<Clock className="h-4 w-4" />} />
        <MetricCard title="Outstanding" value={formatCents(owed)} description="Not yet paid" icon={<Wallet className="h-4 w-4" />} />
        <MetricCard
          title="Overdue"
          value={formatCents(overdueCents)}
          description={`${overdueRows.length} ${overdueRows.length === 1 ? "share" : "shares"} past due`}
          icon={<AlertCircle className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>Ledger</CardTitle>
            <CardDescription>One row per tenant per billing cycle.</CardDescription>
          </div>
          {properties.length > 1 && (
            <nav aria-label="Filter by property" className="flex flex-wrap gap-2">
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
          <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
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
            <div className="py-8 text-center">
              <Wallet className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted-foreground">
                {rows.length === 0
                  ? "No tenant shares yet. Once a cycle has bills, each tenant's share shows up here."
                  : "Nothing matches this filter."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
