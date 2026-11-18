import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";
import { CycleStatePill } from "@/components/shared/cycle-state-pill";
import { MetricCard } from "@/components/shared/metric-card";
import { EmptyPanel } from "@/components/shared/empty-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Receipt } from "lucide-react";
import { formatCents, formatDateRange } from "@/lib/utils";
import { BillFlagForm } from "@/components/tenant/bill-flag-form";
import { FlagStatusBadge } from "@/components/tenant/flag-status-badge";
import { DownloadInvoiceButton } from "@/components/shared/download-invoice-button";
import { PaySharePanel } from "@/components/tenant/pay-share-panel";
import { buildPaymentNote, displayStatus, summarizeSplits } from "@/lib/payments";

interface PageProps {
  params: { propertyId: string; cycleId: string };
}

export default async function TenantCycleDetailPage({ params }: PageProps) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify tenant belongs to this property
  const { data: tenantRecord } = await supabase
    .from("property_tenants")
    .select("*, properties(*)")
    .eq("property_id", params.propertyId)
    .eq("tenant_id", user.id)
    .in("status", ["active", "departed"])
    .single();

  if (!tenantRecord) notFound();

  const property = tenantRecord.properties as any;

  // Fetch cycle
  const { data: cycle } = await supabase
    .from("billing_cycles")
    .select("*")
    .eq("id", params.cycleId)
    .eq("property_id", params.propertyId)
    .single();

  if (!cycle) notFound();

  // Fetch bills for this cycle
  const { data: bills } = await supabase
    .from("bills")
    .select("*")
    .eq("cycle_id", cycle.id)
    .order("category", { ascending: true });

  // Fetch my splits
  const { data: mySplits } = await supabase
    .from("bill_splits")
    .select("*")
    .eq("tenant_id", tenantRecord.id)
    .in("bill_id", bills?.map((b) => b.id) || []);

  // Fetch my existing flags for bills in this cycle
  const { data: myFlags } = await supabase
    .from("bill_flags")
    .select("id, bill_id, status")
    .eq("flagged_by", user.id)
    .in("bill_id", bills?.map((b) => b.id) || []);

  // Create a map of billId -> my split
  const mySplitsMap = new Map(mySplits?.map((s) => [s.bill_id, s]) || []);

  // Check transparency level - if full, fetch all splits
  let allSplits: any[] = [];
  let allTenants: any[] = [];

  if (property.transparency_level === "full") {
    const { data: splits } = await supabase
      .from("bill_splits")
      .select("*, property_tenants!inner(display_name, email)")
      .eq("property_id", params.propertyId)
      .in("bill_id", bills?.map((b) => b.id) || []);
    allSplits = splits || [];

    const { data: tenants } = await supabase
      .from("property_tenants")
      .select("*")
      .eq("property_id", params.propertyId)
      .order("display_name");
    allTenants = tenants || [];
  }

  // Payment status + the owner's payment handles (readable by their tenants via RLS)
  const { data: paymentMethods } = await supabase
    .from("owner_payment_methods")
    .select("*")
    .eq("owner_id", property.owner_id)
    .maybeSingle();
  const payment = summarizeSplits(mySplits ?? []);
  const lastMarked = (mySplits ?? [])
    .filter((s) => s.payment_status === "marked_paid")
    .sort((a, b) => (b.marked_paid_at ?? "").localeCompare(a.marked_paid_at ?? ""))[0];

  const totalBilledCents =
    bills?.reduce((sum, b) => sum + b.amount_cents, 0) || 0;
  const myTotalCents =
    mySplits?.reduce((sum, s) => sum + s.amount_cents, 0) || 0;

  // Build split map for full transparency view
  const splitMap = new Map<string, Map<string, any>>();
  for (const split of allSplits) {
    if (!splitMap.has(split.tenant_id)) {
      splitMap.set(split.tenant_id, new Map());
    }
    splitMap.get(split.tenant_id)!.set(split.bill_id, split);
  }

  const tenantLookup = new Map(allTenants.map((t) => [t.id, t]));
  const sortedTenantIds = Array.from(
    new Set(allSplits.map((s) => s.tenant_id))
  ).sort((a, b) => {
    const nameA = tenantLookup.get(a)?.display_name || "";
    const nameB = tenantLookup.get(b)?.display_name || "";
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="space-y-6">
      <PageHeading
        backHref={`/dashboard/tenant/properties/${params.propertyId}/bills`}
        backLabel="All bills"
        title={cycle.label}
        badges={<CycleStatePill status={cycle.status} />}
        description={property.name}
        actions={
          cycle.status !== "draft" ? <DownloadInvoiceButton cycleId={cycle.id} /> : undefined
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <MetricCard
          title="Your share"
          value={formatCents(myTotalCents)}
          description={`of ${formatCents(totalBilledCents)} billed`}
        />
        <MetricCard
          title="Bills"
          value={bills?.length || 0}
          description="utilities this cycle"
        />
      </div>

      {cycle.status !== "draft" && (
      <PaySharePanel
        cycleId={cycle.id}
        propertyId={params.propertyId}
        owedCents={payment.owedCents}
        markedPaidCents={payment.markedPaidCents}
        confirmedCents={payment.confirmedCents}
        status={displayStatus(payment.status, cycle.due_date)}
        dueDate={cycle.due_date ?? null}
        methods={paymentMethods ?? null}
        payeeName={paymentMethods?.payee_name}
        note={buildPaymentNote(property.name, cycle.label)}
        lastNote={lastMarked?.payment_note}
        markedPaidAt={lastMarked?.marked_paid_at}
      />
      )}

      {/* My Bill Breakdown (always shown) */}
      <Card>
        <CardHeader>
          <CardTitle>Your breakdown</CardTitle>
          <CardDescription>Each bill is split by the days you lived here.</CardDescription>
        </CardHeader>
        <CardContent>
          {bills && bills.length > 0 ? (
            <>
              {/* Phone: one statement line per bill */}
              <ul className="divide-y sm:hidden">
                {bills.map((bill) => {
                  const mySplit = mySplitsMap.get(bill.id);
                  return (
                    <li key={bill.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-medium capitalize">{bill.category}</p>
                        <p className="truncate text-sm text-muted-foreground">{bill.provider}</p>
                        <p className="figure text-xs text-muted-foreground">
                          {mySplit
                            ? `${mySplit.person_days} of ${mySplit.total_person_days} days`
                            : "No days"}
                          {" · "}
                          {formatCents(bill.amount_cents)} bill
                        </p>
                      </div>
                      <p className="figure shrink-0 text-base font-medium">
                        {formatCents(mySplit?.amount_cents || 0)}
                      </p>
                    </li>
                  );
                })}
                <li className="flex items-center justify-between gap-3 pt-3">
                  <span className="font-medium">Your total</span>
                  <span className="figure text-lg font-medium">{formatCents(myTotalCents)}</span>
                </li>
              </ul>

              {/* Tablet and up: full table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead className="hidden md:table-cell">Service period</TableHead>
                      <TableHead className="text-right">Bill</TableHead>
                      <TableHead className="text-right">Days</TableHead>
                      <TableHead className="text-right">Your share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((bill) => {
                      const mySplit = mySplitsMap.get(bill.id);
                      return (
                        <TableRow key={bill.id}>
                          <TableCell className="capitalize font-medium">
                            {bill.category}
                          </TableCell>
                          <TableCell>{bill.provider}</TableCell>
                          <TableCell className="hidden text-muted-foreground md:table-cell">
                            {formatDateRange(bill.service_start, bill.service_end)}
                          </TableCell>
                          <TableCell className="figure text-right">
                            {formatCents(bill.amount_cents)}
                          </TableCell>
                          <TableCell className="figure text-right text-muted-foreground">
                            {mySplit ? (
                              <>
                                {mySplit.person_days} / {mySplit.total_person_days}
                              </>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="figure text-right font-medium">
                            {formatCents(mySplit?.amount_cents || 0)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="border-t-2 font-medium hover:bg-transparent">
                      <TableCell colSpan={2} className="md:hidden">Total</TableCell>
                      <TableCell colSpan={3} className="hidden md:table-cell">Total</TableCell>
                      <TableCell className="figure text-right">
                        {formatCents(totalBilledCents)}
                      </TableCell>
                      <TableCell />
                      <TableCell className="figure text-right">
                        {formatCents(myTotalCents)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <EmptyPanel
              icon={Receipt}
              title="No bills in this cycle yet"
              description="Your landlord hasn't added bills for this period. Check back once they do."
            />
          )}
        </CardContent>
      </Card>

      {/* Full Breakdown (only if transparency is full) */}
      {property.transparency_level === "full" &&
        allSplits.length > 0 &&
        bills &&
        bills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Household breakdown</CardTitle>
              <CardDescription>Everyone&apos;s share of each bill, by days lived here.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-card z-10 min-w-[7.5rem]">
                      Tenant
                    </TableHead>
                    {bills.map((bill) => (
                      <TableHead
                        key={bill.id}
                        className="text-right min-w-[8.5rem]"
                      >
                        <div className="capitalize font-medium text-foreground">
                          {bill.category}
                        </div>
                        <div className="text-xs font-normal text-muted-foreground">
                          {bill.provider}
                        </div>
                        <div className="figure text-xs font-normal text-muted-foreground">
                          {formatCents(bill.amount_cents)}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-right min-w-[6rem]">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTenantIds.map((tenantId) => {
                    const tenant = tenantLookup.get(tenantId);
                    let rowTotal = 0;
                    const isMe = tenantId === tenantRecord.id;

                    return (
                      <TableRow
                        key={tenantId}
                        className={isMe ? "bg-accent/60 hover:bg-accent/60" : ""}
                      >
                        <TableCell
                          className={`sticky left-0 z-10 font-medium ${isMe ? "bg-accent" : "bg-card"}`}
                        >
                          {tenant?.display_name || "Unknown"}
                          {isMe && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (You)
                            </span>
                          )}
                        </TableCell>
                        {bills.map((bill) => {
                          const split = splitMap.get(tenantId)?.get(bill.id);
                          const amount = split?.amount_cents || 0;
                          rowTotal += amount;

                          return (
                            <TableCell key={bill.id} className="text-right">
                              <div className="figure">{formatCents(amount)}</div>
                              {split && split.person_days > 0 && (
                                <div className="figure text-xs text-muted-foreground">
                                  {split.person_days}d / {split.total_person_days}d
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="figure text-right font-medium">
                          {formatCents(rowTotal)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="border-t-2 font-medium hover:bg-transparent">
                    <TableCell className="sticky left-0 bg-card z-10">
                      Total
                    </TableCell>
                    {bills.map((bill) => (
                      <TableCell key={bill.id} className="figure text-right">
                        {formatCents(bill.amount_cents)}
                      </TableCell>
                    ))}
                    <TableCell className="figure text-right">
                      {formatCents(totalBilledCents)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

      {/* Flag Bills */}
      {cycle.status === "open" && bills && bills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning-soft-foreground" aria-hidden="true" />
              See an issue?
            </CardTitle>
            <CardDescription>
              Flag a bill if something looks wrong. Your landlord is notified and can review it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {bills.map((bill) => {
                const existingFlag = myFlags?.find(
                  (f) => f.bill_id === bill.id
                );
                return (
                  <li
                    key={bill.id}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize">
                        {bill.category}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {bill.provider}{" "}
                        <span className="figure">{formatCents(bill.amount_cents)}</span>
                      </p>
                    </div>
                    {existingFlag ? (
                      <FlagStatusBadge status={existingFlag.status as any} />
                    ) : (
                      <BillFlagForm
                        billId={bill.id}
                        billCategory={bill.category}
                        billProvider={bill.provider}
                        billAmountCents={bill.amount_cents}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
