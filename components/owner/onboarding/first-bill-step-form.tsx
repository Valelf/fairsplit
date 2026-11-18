"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createFirstCycleAndBill } from "@/lib/actions/onboarding";
import { BILL_CATEGORIES, firstBillSchema, firstIssue } from "@/lib/onboarding/steps";
import { BILL_CATEGORY_LABELS } from "@/lib/utilities/categories";

const CATEGORY_LABELS = BILL_CATEGORY_LABELS;

interface FirstBillStepFormProps {
  propertyId: string;
  defaultStart: string;
  defaultEnd: string;
  tenantCount: number;
}

/** Step 3: the first billing cycle plus its first bill. Saving it stores the person-days split. */
export function FirstBillStepForm({ propertyId, defaultStart, defaultEnd, tenantCount }: FirstBillStepFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("electricity");
  const [cycleStart, setCycleStart] = useState(defaultStart);
  const [cycleEnd, setCycleEnd] = useState(defaultEnd);
  const [serviceStart, setServiceStart] = useState(defaultStart);
  const [serviceEnd, setServiceEnd] = useState(defaultEnd);
  const [serviceTouched, setServiceTouched] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const input = {
      property_id: propertyId,
      cycle_start: cycleStart,
      cycle_end: cycleEnd,
      category: category as (typeof BILL_CATEGORIES)[number],
      provider: String(form.get("provider") ?? ""),
      amount: String(form.get("amount") ?? ""),
      service_start: serviceStart,
      service_end: serviceEnd,
    };
    const check = firstBillSchema.safeParse(input);
    if (!check.success) return setError(firstIssue(check.error));

    setLoading(true);
    const result = await createFirstCycleAndBill(input);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push("/onboarding?step=done");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Billing cycle</legend>
        <p className="text-xs text-muted-foreground">
          The period you collect for, usually one month. Bills are grouped into cycles.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cycle_start">Starts</Label>
            <Input
              id="cycle_start"
              type="date"
              value={cycleStart}
              onChange={(e) => {
                setCycleStart(e.target.value);
                if (!serviceTouched) setServiceStart(e.target.value);
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cycle_end">Ends</Label>
            <Input
              id="cycle_end"
              type="date"
              value={cycleEnd}
              onChange={(e) => {
                setCycleEnd(e.target.value);
                if (!serviceTouched) setServiceEnd(e.target.value);
              }}
              required
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium">First bill</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="category">Type</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILL_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Input id="provider" name="provider" placeholder="e.g. City Power & Light" required />
          </div>
        </div>
        <div className="space-y-2 sm:w-1/2">
          <Label htmlFor="amount">Amount (USD)</Label>
          <Input id="amount" name="amount" inputMode="decimal" placeholder="142.50" required />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium" id="service-label">
            Service dates on the bill
          </p>
          <p className="text-xs text-muted-foreground">
            The days the bill covers. Each tenant pays for the days they lived there in this period.
          </p>
          <div className="grid gap-4 sm:grid-cols-2" role="group" aria-labelledby="service-label">
            <div className="space-y-2">
              <Label htmlFor="service_start">From</Label>
              <Input
                id="service_start"
                type="date"
                value={serviceStart}
                onChange={(e) => {
                  setServiceTouched(true);
                  setServiceStart(e.target.value);
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_end">To</Label>
              <Input
                id="service_end"
                type="date"
                value={serviceEnd}
                onChange={(e) => {
                  setServiceTouched(true);
                  setServiceEnd(e.target.value);
                }}
                required
              />
            </div>
          </div>
        </div>
      </fieldset>

      {tenantCount === 0 && (
        <p className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
          You haven&apos;t added any tenants yet, so there&apos;s no one to split this bill with.{" "}
          <Link href="/onboarding?step=tenants" className="font-medium text-foreground underline underline-offset-4">
            Add tenants first
          </Link>
          .
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button asChild variant="ghost">
            <Link href="/onboarding?step=tenants">Back</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/onboarding?step=done">Skip for now</Link>
          </Button>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Calculator className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Save and split
        </Button>
      </div>
    </form>
  );
}
