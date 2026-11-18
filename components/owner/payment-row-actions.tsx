"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmTenantPayment, reopenTenantPayment } from "@/lib/actions/payments";
import type { DisplayPaymentStatus } from "@/lib/payments";

interface PaymentRowActionsProps {
  cycleId: string;
  propertyId: string;
  propertyTenantId: string;
  tenantName: string;
  status: DisplayPaymentStatus;
}

export function PaymentRowActions({
  cycleId,
  propertyId,
  propertyTenantId,
  tenantName,
  status,
}: PaymentRowActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"confirm" | "reopen" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (kind: "confirm" | "reopen") => {
    setError(null);
    setAction(kind);
    startTransition(async () => {
      const fn = kind === "confirm" ? confirmTenantPayment : reopenTenantPayment;
      const result = await fn({ cycleId, propertyId, propertyTenantId });
      if ("error" in result) setError(result.error);
      else router.refresh();
      setAction(null);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-2">
        {status !== "confirmed" && (
          <Button
            size="sm"
            variant={status === "marked_paid" ? "default" : "outline"}
            disabled={pending}
            onClick={() => run("confirm")}
            aria-label={`Confirm payment from ${tenantName}`}
          >
            {pending && action === "confirm" ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="mr-1 h-4 w-4" aria-hidden="true" />
            )}
            Confirm
          </Button>
        )}
        {status !== "owed" && status !== "overdue" && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run("reopen")}
            aria-label={`Reopen payment for ${tenantName}`}
            title="Mark as owed again"
          >
            {pending && action === "reopen" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="sr-only sm:not-sr-only sm:ml-1">Reopen</span>
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
