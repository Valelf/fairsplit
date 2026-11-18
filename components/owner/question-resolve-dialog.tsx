"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { resolveQuestion } from "@/lib/actions/questions";
import { centsToInput, dollarsToCents } from "@/lib/owner/money";
import { QUESTION_BODY_MAX } from "@/lib/questions/helpers";
import { formatCents } from "@/lib/utils";

/** Owner closes a bill question, optionally correcting the bill amount (shares re-split). */
export function QuestionResolveDialog({
  questionId,
  currentAmountCents,
  cycleClosed,
}: {
  questionId: string;
  currentAmountCents: number;
  /** Closed cycles can't be edited, so the correction option is disabled. */
  cycleClosed: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [correct, setCorrect] = useState(false);
  const [amount, setAmount] = useState(centsToInput(currentAmountCents));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let correctedAmountCents: number | undefined;
    if (correct) {
      const cents = dollarsToCents(amount);
      if (cents === null || cents <= 0) {
        setError("Enter the corrected amount, like 102.50");
        return;
      }
      correctedAmountCents = cents;
    }
    startTransition(async () => {
      const res = await resolveQuestion({ questionId, note: note || undefined, correctedAmountCents });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CheckCircle2 aria-hidden="true" />
          Resolve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Resolve question</DialogTitle>
            <DialogDescription>
              The tenant is notified. If the bill was wrong, correct it here and everyone&apos;s share is
              recalculated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="resolve-note">Closing note (optional)</Label>
            <textarea
              id="resolve-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={QUESTION_BODY_MAX}
              rows={3}
              placeholder="e.g. Checked with the provider, the amount is right."
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm"
            />
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-start gap-2">
              <input
                id="resolve-correct"
                type="checkbox"
                checked={correct}
                disabled={cycleClosed}
                onChange={(e) => setCorrect(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <Label htmlFor="resolve-correct" className="leading-snug">
                Correct the amount
                <span className="block text-xs font-normal text-muted-foreground">
                  {cycleClosed ? (
                    "This cycle is closed. Reopen it to change its bills."
                  ) : (
                    <>
                      Currently <span className="figure">{formatCents(currentAmountCents)}</span>
                    </>
                  )}
                </span>
              </Label>
            </div>
            {correct && (
              <div className="space-y-1.5">
                <Label htmlFor="resolve-amount">Corrected amount ($)</Label>
                <Input
                  id="resolve-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="figure"
                />
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {correct ? "Correct and resolve" : "Resolve"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
