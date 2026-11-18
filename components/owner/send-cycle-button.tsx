"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publishCycleToTenants } from "@/lib/actions/notify";

interface SendCycleButtonProps {
  cycleId: string;
  propertyId: string;
  /** True once every eligible tenant has been emailed; the button then offers a re-check. */
  allSent?: boolean;
  label?: string;
}

/** Owner: email tenants their share of this cycle. Idempotent on the server. */
export function SendCycleButton({ cycleId, propertyId, allSent = false, label }: SendCycleButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button
        type="button"
        size="sm"
        variant={allSent ? "outline" : "default"}
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await publishCycleToTenants({ cycleId, propertyId });
            if ("error" in result) {
              setMessage({ tone: "error", text: result.error });
              return;
            }
            const parts: string[] = [];
            if (result.sent) parts.push(`${result.sent} emailed`);
            if (result.skipped) parts.push(`${result.skipped} logged (email not configured)`);
            if (result.failed) parts.push(`${result.failed} failed`);
            if (result.alreadySent) parts.push(`${result.alreadySent} already notified`);
            setMessage({
              tone: result.failed ? "error" : "ok",
              text: parts.length ? parts.join(" · ") : "No active tenants with a share to notify",
            });
            router.refresh();
          });
        }}
      >
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="mr-2 h-4 w-4" aria-hidden="true" />
        )}
        {label ?? (allSent ? "Send to new tenants" : "Send to tenants")}
      </Button>
      <p
        role="status"
        aria-live="polite"
        className={message?.tone === "error" ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
      >
        {message?.text}
      </p>
    </div>
  );
}
