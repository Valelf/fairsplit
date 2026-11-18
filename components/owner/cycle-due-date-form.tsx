"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setCycleDueDate } from "@/lib/actions/payments";

interface CycleDueDateFormProps {
  cycleId: string;
  propertyId: string;
  dueDate: string | null;
}

export function CycleDueDateForm({ cycleId, propertyId, dueDate }: CycleDueDateFormProps) {
  const router = useRouter();
  const [value, setValue] = useState(dueDate ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputId = `due-date-${cycleId}`;

  return (
    <form
      className="flex w-full flex-wrap items-end gap-2 sm:w-auto"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await setCycleDueDate({ cycleId, propertyId, dueDate: value || null });
          if ("error" in result) setError(result.error);
          else router.refresh();
        });
      }}
    >
      <div className="min-w-0 flex-1 space-y-1 sm:flex-none">
        <Label htmlFor={inputId} className="text-xs text-muted-foreground">
          Due date
        </Label>
        <Input
          id={inputId}
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="figure w-full sm:w-auto"
        />
      </div>
      <Button type="submit" variant="outline" className="h-10" disabled={pending || value === (dueDate ?? "")}>
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        Save
      </Button>
      {error && (
        <p role="alert" className="w-full text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
