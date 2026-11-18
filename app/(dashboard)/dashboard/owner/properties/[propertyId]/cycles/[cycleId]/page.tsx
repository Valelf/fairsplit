import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, DollarSign } from "lucide-react";
import { formatCents, formatDateRange } from "@/lib/utils";
import Link from "next/link";
import { BillSplitTable } from "@/components/shared/bill-split-table";
import { PdfViewerLink } from "@/components/shared/pdf-viewer-link";
import { DownloadInvoiceButton } from "@/components/shared/download-invoice-button";
import { CyclePaymentsPanel } from "@/components/owner/cycle-payments-panel";
import { CycleStatusActions } from "@/components/owner/cycle-status-actions";
import { BillActions } from "@/components/owner/bill-actions";
import { CycleNotifyPanel } from "@/components/owner/cycle-notify-panel";

interface PageProps {
  params: { propertyId: string; cycleId: string };
}

export default async function CycleDetailPage({ params }: PageProps) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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

  // Fetch bill splits with tenant names
  const { data: splits } = await supabase
    .from("bill_splits")
    .select("*, property_tenants!inner(display_name, email)")
    .eq("property_id", params.propertyId)
    .in("bill_id", bills?.map((b) => b.id) || []);

  // Fetch tenants
  const { data: tenants } = await supabase
    .from("property_tenants")
    .select("*")
    .eq("property_id", params.propertyId)
    .order("display_name");

  const totalBilledCents =
    bills?.reduce((sum, b) => sum + b.amount_cents, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link
            href={`/dashboard/owner/properties/${params.propertyId}/overview`}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {cycle.label}
            </h1>
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
          <p className="text-muted-foreground">
            {cycle.start_date && cycle.end_date && (
              <>
                {formatDateRange(cycle.start_date, cycle.end_date)} &middot;{" "}
              </>
            )}
            {bills?.length || 0} bills &middot;{" "}
            {formatCents(totalBilledCents)} total
          </p>
        </div>
        <CycleStatusActions
          cycleId={cycle.id}
          label={cycle.label}
          status={cycle.status}
        />
        {cycle.status !== "closed" && (
          <Button asChild>
            <Link
              href={`/dashboard/owner/properties/${params.propertyId}/bills/new?cycleId=${cycle.id}`}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Bill
            </Link>
          </Button>
        )}
      </div>

      {/* Bills Summary Cards */}
      {bills && bills.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {bills.map((bill) => (
            <Card key={bill.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium capitalize">
                    {bill.category}
                  </CardTitle>
                  {cycle.status !== "closed" ? (
                    <BillActions bill={bill} />
                  ) : (
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCents(bill.amount_cents)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {bill.provider} &middot;{" "}
                  {formatDateRange(bill.service_start, bill.service_end)}
                </p>
                {bill.pdf_storage_path && (
                  <PdfViewerLink billId={bill.id} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CycleNotifyPanel propertyId={params.propertyId} cycleId={cycle.id} />
      <CyclePaymentsPanel propertyId={params.propertyId} cycleId={cycle.id} />

      {/* Invoice Downloads */}
      {bills && bills.length > 0 && tenants && tenants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tenants
                .filter((t) => t.status !== "departed" || true)
                .map((tenant) => (
                  <div
                    key={tenant.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {tenant.display_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tenant.email}
                      </p>
                    </div>
                    <DownloadInvoiceButton
                      cycleId={cycle.id}
                      tenantId={tenant.id}
                    />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bill Split Table */}
      {bills && bills.length > 0 && tenants && splits ? (
        <BillSplitTable
          bills={bills}
          tenants={tenants}
          splits={splits as any}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <DollarSign className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No bills in this cycle yet. Add a bill to see the split
              breakdown.
            </p>
            {cycle.status !== "closed" && (
              <Button asChild variant="outline" className="mt-4">
                <Link
                  href={`/dashboard/owner/properties/${params.propertyId}/bills/new?cycleId=${cycle.id}`}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Bill
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
