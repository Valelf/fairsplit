"use client";

import { useState } from "react";
import { submitFlag } from "@/lib/actions/flags";
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
import { AlertTriangle, Loader2 } from "lucide-react";

interface BillFlagFormProps {
  billId: string;
  billCategory: string;
  billProvider: string;
  billAmountCents: number;
}

export function BillFlagForm({
  billId,
  billCategory,
  billProvider,
  billAmountCents,
}: BillFlagFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const reason = formData.get("reason") as string;
    const suggestedAmount = formData.get("suggestedAmount") as string;

    const result = await submitFlag({
      billId,
      reason,
      suggestedAmountCents: suggestedAmount
        ? Math.round(parseFloat(suggestedAmount) * 100)
        : undefined,
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
        <Button variant="outline" size="sm">
          <AlertTriangle className="mr-2 h-3 w-3" />
          Flag
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Flag Bill</DialogTitle>
          <DialogDescription>
            Flag the {billCategory} bill from {billProvider} (
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(billAmountCents / 100)}
            ) if something looks incorrect.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <textarea
              id="reason"
              name="reason"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Explain why you think this bill is incorrect..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="suggestedAmount">
              Suggested Amount ($) <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="suggestedAmount"
              name="suggestedAmount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="What do you think the correct amount is?"
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
            <Button type="submit" disabled={loading} variant="destructive">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Flag
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
