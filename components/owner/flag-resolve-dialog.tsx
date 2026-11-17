"use client";

import { useState } from "react";
import { resolveFlag } from "@/lib/actions/flags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle, Loader2 } from "lucide-react";

interface FlagResolveDialogProps {
  flagId: string;
  currentAmountCents: number;
  suggestedAmountCents: number | null;
}

export function FlagResolveDialog({
  flagId,
  currentAmountCents,
  suggestedAmountCents,
}: FlagResolveDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const resolvedAmount = parseFloat(formData.get("resolvedAmount") as string);
    const resolutionNote = formData.get("resolutionNote") as string;

    if (isNaN(resolvedAmount) || resolvedAmount <= 0) {
      setError("Please enter a valid amount");
      setLoading(false);
      return;
    }

    const result = await resolveFlag({
      flagId,
      resolvedAmountCents: Math.round(resolvedAmount * 100),
      resolutionNote,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <CheckCircle className="mr-2 h-3 w-3" />
          Resolve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Flag</DialogTitle>
          <DialogDescription>
            Adjust the bill amount and provide a resolution note. This will
            recalculate all tenant splits.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resolvedAmount">Adjusted Amount ($)</Label>
            <Input
              id="resolvedAmount"
              name="resolvedAmount"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={(
                (suggestedAmountCents || currentAmountCents) / 100
              ).toFixed(2)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Current: $
              {(currentAmountCents / 100).toFixed(2)}
              {suggestedAmountCents &&
                ` | Suggested: $${(suggestedAmountCents / 100).toFixed(2)}`}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="resolutionNote">Resolution Note</Label>
            <textarea
              id="resolutionNote"
              name="resolutionNote"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Explain the resolution..."
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Resolve & Recalculate
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
