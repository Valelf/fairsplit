import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, DollarSign, Calendar, AlertTriangle } from "lucide-react";
import { formatCents, formatDateRange } from "@/lib/utils";
import Link from "next/link";
import { BillFlagForm } from "@/components/tenant/bill-flag-form";
import { FlagStatusBadge } from "@/components/tenant/flag-status-badge";
import { DownloadInvoiceButton } from "@/components/shared/download-invoice-button";

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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link
            href={`/dashboard/tenant/properties/${params.propertyId}/bills`}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{cycle.label}</h1>
            <Badge
              variant={
                cycle.status === "closed"
                  ? "secondary"
                  : cycle.status === "open"
                    ? "default"
                    : "outline"
              }
            >
              {cycle.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{property.name}</p>
        </div>
        {cycle.status !== "draft" && (
          <DownloadInvoiceButton cycleId={cycle.id} />
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Share</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCents(myTotalCents)}</div>
            <p className="text-xs text-muted-foreground">
              of {formatCents(totalBilledCents)} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{bills?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              utilities in this cycle
            </p>
          </CardContent>
        </Card>
      </div>

      {/* My Bill Breakdown (always shown) */}
      <Card>
        <CardHeader>
          <CardTitle>Your Bill Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {bills && bills.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Service Period</TableHead>
                  <TableHead className="text-right">Total Bill</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead className="text-right">Your Share</TableHead>
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
                      <TableCell className="text-muted-foreground">
                        {formatDateRange(bill.service_start, bill.service_end)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCents(bill.amount_cents)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {mySplit ? (
                          <>
                            {mySplit.person_days} / {mySplit.total_person_days}
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCents(mySplit?.amount_cents || 0)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="border-t-2 font-bold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right">
                    {formatCents(totalBilledCents)}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right">
                    {formatCents(myTotalCents)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6">
              <DollarSign className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No bills in this cycle yet.
              </p>
            </div>
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
              <CardTitle>Full Household Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-card z-10 min-w-[120px]">
                      Tenant
                    </TableHead>
                    {bills.map((bill) => (
                      <TableHead
                        key={bill.id}
                        className="text-center min-w-[140px]"
                      >
                        <div className="capitalize font-medium">
                          {bill.category}
                        </div>
                        <div className="text-xs font-normal text-muted-foreground">
                          {bill.provider}
                        </div>
                        <div className="text-xs font-normal text-muted-foreground">
                          {formatCents(bill.amount_cents)}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center min-w-[100px] font-bold">
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
                        className={isMe ? "bg-accent/50" : ""}
                      >
                        <TableCell className="sticky left-0 bg-card z-10 font-medium">
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
                            <TableCell key={bill.id} className="text-center">
                              <div>{formatCents(amount)}</div>
                              {split && split.person_days > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {split.person_days}d / {split.total_person_days}
                                  d
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-bold">
                          {formatCents(rowTotal)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell className="sticky left-0 bg-card z-10">
                      Total
                    </TableCell>
                    {bills.map((bill) => (
                      <TableCell key={bill.id} className="text-center">
                        {formatCents(bill.amount_cents)}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
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
              <AlertTriangle className="h-5 w-5" />
              See an issue?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Flag a bill if something looks incorrect. The property owner will
              be notified and can review your flag.
            </p>
            <div className="space-y-2">
              {bills.map((bill) => {
                const existingFlag = myFlags?.find(
                  (f) => f.bill_id === bill.id
                );
                return (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div>
                      <span className="text-sm font-medium capitalize">
                        {bill.category}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {" "}
                        - {bill.provider} ({formatCents(bill.amount_cents)})
                      </span>
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
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
