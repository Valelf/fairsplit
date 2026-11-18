import { Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CycleDueDateForm } from "@/components/owner/cycle-due-date-form";
import { PaymentLedgerTable } from "@/components/owner/payment-ledger-table";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { createClient } from "@/lib/supabase/server";
import { getOwnerPaymentLedger } from "@/lib/queries/payments";
import { cn, formatCents } from "@/lib/utils";

interface CyclePaymentsPanelProps {
  propertyId: string;
  cycleId: string;
}

function Tally({ label, cents, className }: { label: string; cents: number; className?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("figure truncate text-base font-medium sm:text-lg", className)}>{formatCents(cents)}</dd>
    </div>
  );
}

/** Owner view of who has paid for one cycle. Self-contained: fetches its own data. */
export async function CyclePaymentsPanel({ propertyId, cycleId }: CyclePaymentsPanelProps) {
  const supabase = createClient();
  const { data: cycle } = await supabase
    .from("billing_cycles")
    .select("id, due_date")
    .eq("id", cycleId)
    .eq("property_id", propertyId)
    .maybeSingle();
  if (!cycle) return null;

  const { rows } = await getOwnerPaymentLedger({ propertyId, cycleId });
  const collected = rows.reduce((sum, r) => sum + r.summary.confirmedCents, 0);
  const awaiting = rows.reduce((sum, r) => sum + r.summary.markedPaidCents, 0);
  const owed = rows.reduce((sum, r) => sum + r.summary.owedCents, 0);

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
              Payments
            </CardTitle>
            <CardDescription>Who has paid their share of this cycle.</CardDescription>
          </div>
          <CycleDueDateForm cycleId={cycleId} propertyId={propertyId} dueDate={cycle.due_date ?? null} />
        </div>
        <dl className="grid grid-cols-3 gap-3 rounded-lg bg-muted/60 p-3">
          <Tally label="Confirmed" cents={collected} className="text-success" />
          <Tally label="Awaiting" cents={awaiting} className="text-info-soft-foreground" />
          <Tally label="Owed" cents={owed} className={owed > 0 ? "text-warning-soft-foreground" : undefined} />
        </dl>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <PaymentLedgerTable rows={rows} showProperty={false} showCycle={false} />
        ) : (
          <EmptyPanel
            icon={Wallet}
            title="No tenant shares yet"
            description="Add a bill to this cycle to see who owes what."
          />
        )}
      </CardContent>
    </Card>
  );
}
