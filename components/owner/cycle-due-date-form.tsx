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
      className="flex flex-wrap items-end gap-2"
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
      <div className="space-y-1">
        <Label htmlFor={inputId}>Due date</Label>
        <Input
          id={inputId}
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-auto"
        />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending || value === (dueDate ?? "")}>
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
