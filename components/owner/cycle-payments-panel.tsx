import { Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CycleDueDateForm } from "@/components/owner/cycle-due-date-form";
import { PaymentLedgerTable } from "@/components/owner/payment-ledger-table";
import { createClient } from "@/lib/supabase/server";
import { getOwnerPaymentLedger } from "@/lib/queries/payments";
import { formatCents } from "@/lib/utils";

interface CyclePaymentsPanelProps {
  propertyId: string;
  cycleId: string;
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
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" aria-hidden="true" />
              Payments
            </CardTitle>
            <CardDescription>
              {formatCents(collected)} confirmed &middot; {formatCents(awaiting)} awaiting confirmation
              &middot; {formatCents(owed)} owed
            </CardDescription>
          </div>
          <CycleDueDateForm cycleId={cycleId} propertyId={propertyId} dueDate={cycle.due_date ?? null} />
        </div>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <PaymentLedgerTable rows={rows} showProperty={false} showCycle={false} />
        ) : (
          <p className="text-sm text-muted-foreground">
            No tenant shares yet. Add a bill to this cycle to see who owes what.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
