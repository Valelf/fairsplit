"use client";

import { useState, useTransition } from "react";
import { setEmailReminders } from "@/lib/actions/notify";

interface EmailRemindersToggleProps {
  enabled: boolean;
  label?: string;
  description?: string;
}

/** Opt in/out of reminder emails. "Your bills are ready" emails are always sent. */
export function EmailRemindersToggle({
  enabled,
  label = "Payment reminder emails",
  description = "A reminder 3 days before a due date and one if a payment is overdue. Bill-ready emails are always sent.",
}: EmailRemindersToggleProps) {
  const [checked, setChecked] = useState(enabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          checked={checked}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setChecked(next);
            setError(null);
            startTransition(async () => {
              const result = await setEmailReminders({ emailReminders: next });
              if ("error" in result) {
                setChecked(!next);
                setError(result.error);
              }
            });
          }}
        />
        <span className="space-y-0.5">
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </span>
      </label>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
