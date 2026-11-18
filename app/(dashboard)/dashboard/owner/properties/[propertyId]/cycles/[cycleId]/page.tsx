import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Receipt, FileDown } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { CycleStatePill } from "@/components/shared/cycle-state-pill";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { formatCents, formatDateRange } from "@/lib/utils";
import Link from "next/link";
import { BillSplitTable } from "@/components/shared/bill-split-table";
import { PdfViewerLink } from "@/components/shared/pdf-viewer-link";
import { DownloadInvoiceButton } from "@/components/shared/download-invoice-button";
import { CyclePaymentsPanel } from "@/components/owner/cycle-payments-panel";
import { CycleStatusActions } from "@/components/owner/cycle-status-actions";
import { BillActions } from "@/components/owner/bill-actions";
import { CycleNotifyPanel } from "@/components/owner/cycle-notify-panel";
import { MonthlyBillsChecklist } from "@/components/owner/monthly-bills-checklist";
import { getUtilityAccountsWithLastBill } from "@/lib/server/utility-accounts";

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

  // Split-rule exclusions per bill (for the edit dialog)
  const { data: exclusions } = await supabase
    .from("bill_split_exclusions")
    .select("bill_id, property_tenant_id, reason")
    .in("bill_id", bills?.map((b) => b.id) || []);
  const splitTenants = (tenants ?? []).map((t) => ({
    id: t.id,
    display_name: t.display_name,
    join_date: t.join_date,
    leave_date: t.leave_date,
  }));

  const totalBilledCents =
    bills?.reduce((sum, b) => sum + b.amount_cents, 0) || 0;

  // Utility accounts still missing a bill in this cycle (pre-filled "Add bill" links)
  const utilityAccounts =
    cycle.status !== "closed"
      ? await getUtilityAccountsWithLastBill(params.propertyId, { activeOnly: true })
      : [];
  const checklist = utilityAccounts.map((a) => ({
    ...a,
    added: (bills ?? []).some((b) => b.utility_account_id === a.id),
  }));

  const addBillHref = `/dashboard/owner/properties/${params.propertyId}/bills/new?cycleId=${cycle.id}`;
  const hasBills = !!bills && bills.length > 0;

  return (
    <div className="space-y-6">
      <PageHeading
        backHref={`/dashboard/owner/properties/${params.propertyId}/overview`}
        backLabel="Property overview"
        title={cycle.label}
        badges={<CycleStatePill status={cycle.status} />}
        description={
          <>
            {cycle.start_date && cycle.end_date && (
              <>
                {formatDateRange(cycle.start_date, cycle.end_date)} &middot;{" "}
              </>
            )}
            {bills?.length || 0} bills &middot;{" "}
            <span className="font-mono tabular-nums text-foreground">
              {formatCents(totalBilledCents)}
            </span>{" "}
            total
          </>
        }
        actions={
          <>
            <CycleStatusActions
              cycleId={cycle.id}
              label={cycle.label}
              status={cycle.status}
            />
            {cycle.status !== "closed" && (
              <Button asChild>
                <Link href={addBillHref}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Add Bill
                </Link>
              </Button>
            )}
          </>
        }
      />

      {checklist.some((a) => !a.added) && (
        <MonthlyBillsChecklist
          propertyId={params.propertyId}
          cycleId={cycle.id}
          accounts={checklist}
          cycle={{ start_date: cycle.start_date ?? null, end_date: cycle.end_date ?? null }}
        />
      )}

      {/* Bills in this cycle */}
      {hasBills && (
        <section aria-labelledby="cycle-bills-heading" className="space-y-3">
          <h2 id="cycle-bills-heading" className="font-display text-lg font-semibold">
            Bills
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bills.map((bill) => (
              <li key={bill.id}>
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium capitalize">
                          {bill.category}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">{bill.provider}</p>
                      </div>
                      {cycle.status !== "closed" && (
                        <BillActions
                          bill={bill}
                          tenants={splitTenants}
                          exclusions={(exclusions ?? []).filter((e) => e.bill_id === bill.id)}
                        />
                      )}
                    </div>
                    <p className="font-mono text-2xl font-semibold tabular-nums">
                      {formatCents(bill.amount_cents)}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatDateRange(bill.service_start, bill.service_end)}</span>
                      {bill.pdf_storage_path && <PdfViewerLink billId={bill.id} />}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Split matrix: show the math */}
      {hasBills && tenants && splits ? (
        <BillSplitTable
          bills={bills}
          tenants={tenants}
          splits={splits as any}
        />
      ) : (
        <EmptyPanel
          icon={Receipt}
          title="No bills in this cycle yet"
          description="Add a bill to see the split breakdown."
          action={
            cycle.status !== "closed" ? (
              <Button asChild variant="outline">
                <Link href={addBillHref}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Add Bill
                </Link>
              </Button>
            ) : undefined
          }
        />
      )}

      <CyclePaymentsPanel propertyId={params.propertyId} cycleId={cycle.id} />
      <CycleNotifyPanel propertyId={params.propertyId} cycleId={cycle.id} />

      {/* Invoice Downloads */}
      {hasBills && tenants && tenants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <FileDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Generate Invoices
            </CardTitle>
            <CardDescription>A PDF invoice per tenant for this cycle.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-lg border">
              {tenants.map((tenant) => (
                <li
                  key={tenant.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {tenant.display_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {tenant.email}
                    </p>
                  </div>
                  <DownloadInvoiceButton
                    cycleId={cycle.id}
                    tenantId={tenant.id}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
