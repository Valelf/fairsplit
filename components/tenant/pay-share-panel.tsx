"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Undo2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentStatusPill } from "@/components/shared/payment-status-pill";
import { PaymentMethodLinks } from "@/components/shared/payment-method-links";
import { markCyclePaid, unmarkCyclePaid } from "@/lib/actions/payments";
import { formatCents, formatDate } from "@/lib/utils";
import type { DisplayPaymentStatus, OwnerPaymentMethods } from "@/lib/payments";

interface PaySharePanelProps {
  cycleId: string;
  propertyId: string;
  owedCents: number;
  markedPaidCents: number;
  confirmedCents: number;
  status: DisplayPaymentStatus;
  dueDate: string | null;
  methods: OwnerPaymentMethods | null;
  payeeName?: string | null;
  note: string;
  lastNote?: string | null;
  markedPaidAt?: string | null;
}

export function PaySharePanel({
  cycleId,
  propertyId,
  owedCents,
  markedPaidCents,
  confirmedCents,
  status,
  dueDate,
  methods,
  payeeName,
  note,
  lastNote,
  markedPaidAt,
}: PaySharePanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState("");

  const run = (fn: () => Promise<{ error: string } | { success: true }>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if ("error" in result) setError(result.error);
      else {
        setPaymentNote("");
        router.refresh();
      }
    });
  };

  const totalCents = owedCents + markedPaidCents + confirmedCents;
  if (totalCents === 0) return null;

  return (
    <Card className="overflow-hidden border-primary/30">
      <CardHeader className="bg-accent/40">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" aria-hidden="true" />
              Pay your share
            </CardTitle>
            <CardDescription>
              {payeeName ? `Pay ${payeeName} directly.` : "Pay your landlord directly."}
              {dueDate && ` Due ${formatDate(dueDate)}.`}
            </CardDescription>
          </div>
          <PaymentStatusPill status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 pt-2 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-sm text-muted-foreground">Amount due</dt>
            <dd className="figure text-4xl font-medium leading-tight tracking-tight">{formatCents(owedCents)}</dd>
          </div>
          {markedPaidCents > 0 && (
            <div>
              <dt className="text-sm text-muted-foreground">Awaiting confirmation</dt>
              <dd className="figure text-xl font-medium text-info-soft-foreground">{formatCents(markedPaidCents)}</dd>
            </div>
          )}
          {confirmedCents > 0 && (
            <div>
              <dt className="text-sm text-muted-foreground">Confirmed paid</dt>
              <dd className="figure text-xl font-medium text-success">{formatCents(confirmedCents)}</dd>
            </div>
          )}
        </dl>

        {owedCents > 0 && (
          <>
            <PaymentMethodLinks methods={methods} amountCents={owedCents} note={note} />
            <form
              className="space-y-3 border-t pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => markCyclePaid({ cycleId, propertyId, note: paymentNote || undefined }));
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="payment-note">Note for your landlord (optional)</Label>
                <Input
                  id="payment-note"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  maxLength={500}
                  placeholder="e.g. Sent via Zelle on Monday"
                />
              </div>
              <Button type="submit" disabled={pending} className="w-full sm:w-auto">
                {pending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                I&apos;ve paid <span className="figure">{formatCents(owedCents)}</span>
              </Button>
            </form>
          </>
        )}

        {owedCents === 0 && markedPaidCents > 0 && (
          <div className="flex flex-col gap-3 rounded-lg bg-info-soft p-3 text-info-soft-foreground sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              You marked this paid{markedPaidAt ? ` on ${formatDate(markedPaidAt)}` : ""}. Your
              landlord will confirm once they see it.
              {lastNote && <span className="mt-1 block opacity-90">Note: {lastNote}</span>}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => unmarkCyclePaid({ cycleId, propertyId }))}
            >
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Undo2 className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Undo
            </Button>
          </div>
        )}

        {owedCents === 0 && markedPaidCents === 0 && (
          <p className="flex items-center gap-2 rounded-lg bg-success-soft p-3 text-sm text-success-soft-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            All settled. Your landlord confirmed your payment.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
