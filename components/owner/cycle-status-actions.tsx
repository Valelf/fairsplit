"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen } from "lucide-react";
import { closeCycle, reopenCycle } from "@/lib/actions/cycles";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface CycleStatusActionsProps {
  cycleId: string;
  label: string;
  status: "draft" | "open" | "closed";
}

/** Close (finalize) or reopen a billing cycle, with a confirmation step. */
export function CycleStatusActions({ cycleId, label, status }: CycleStatusActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const closed = status === "closed";

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {closed ? <LockOpen className="mr-2 h-4 w-4" aria-hidden="true" /> : <Lock className="mr-2 h-4 w-4" aria-hidden="true" />}
        {closed ? "Reopen cycle" : "Close cycle"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={closed ? `Reopen ${label}?` : `Close ${label}?`}
        description={
          closed
            ? "Bills in this cycle can be edited again. Tenants keep seeing the current amounts."
            : "Closing finalizes this cycle: bills can't be added, edited or deleted until you reopen it. Active tenants are notified."
        }
        confirmLabel={closed ? "Reopen cycle" : "Close cycle"}
        onConfirm={async () => {
          const result = closed ? await reopenCycle(cycleId) : await closeCycle(cycleId);
          if (result.error) return result.error;
          router.refresh();
        }}
      />
    </>
  );
}
