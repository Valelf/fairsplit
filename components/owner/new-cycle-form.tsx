"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCycle } from "@/lib/actions/cycles";
import { nextCycleDates, suggestCycleLabel } from "@/lib/owner/cycle-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import Link from "next/link";
import {
  MonthlyBillsChecklist,
  type ChecklistAccount,
} from "@/components/owner/monthly-bills-checklist";

interface NewCycleFormProps {
  propertyId: string;
  /** Active utility accounts; when present, creating a cycle offers "Add this month's bills". */
  accounts?: ChecklistAccount[];
}

export function NewCycleForm({ propertyId, accounts = [] }: NewCycleFormProps) {
  const params = { propertyId };
  const router = useRouter();
  const [created, setCreated] = useState<{
    id: string;
    label: string;
    start_date: string | null;
    end_date: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initial] = useState(() => nextCycleDates(null));
  const [startDate, setStartDate] = useState(initial.start);
  const [endDate, setEndDate] = useState(initial.end);
  const [label, setLabel] = useState(() => suggestCycleLabel(initial.start, initial.end));
  // Keep suggesting a label from the dates until the owner types their own.
  const [labelEdited, setLabelEdited] = useState(false);

  function updateDates(start: string, end: string) {
    setStartDate(start);
    setEndDate(end);
    if (!labelEdited) setLabel(suggestCycleLabel(start, end));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createCycle({
      property_id: params.propertyId,
      label,
      start_date: startDate || null,
      end_date: endDate || null,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.data) {
      if (accounts.length > 0) {
        setCreated({
          id: result.data.id,
          label: result.data.label,
          start_date: result.data.start_date ?? null,
          end_date: result.data.end_date ?? null,
        });
        setLoading(false);
      } else {
        router.push(
          `/dashboard/owner/properties/${params.propertyId}/cycles/${result.data.id}`
        );
      }
    }
  }

  if (created) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeading
          title={
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-success" aria-hidden="true" />
              {created.label} created
            </span>
          }
          description="Add this month's bills now, or go to the cycle and add them later."
        />
        <MonthlyBillsChecklist
          propertyId={params.propertyId}
          cycleId={created.id}
          accounts={accounts}
          cycle={created}
        />
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href={`/dashboard/owner/properties/${params.propertyId}/cycles/${created.id}`}>
            Go to cycle
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeading
        backHref={`/dashboard/owner/properties/${params.propertyId}/overview`}
        backLabel="Back to property"
        title="New Billing Cycle"
        description="Create a new billing cycle for this property"
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Cycle Details</CardTitle>
          <CardDescription>
            A billing cycle groups the bills you settle together, usually one month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start date</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => updateDates(e.target.value, endDate)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End date</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => updateDates(startDate, e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Cycle Label</Label>
              <Input
                id="label"
                name="label"
                placeholder="e.g. Dec 2026"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  setLabelEdited(e.target.value !== "");
                }}
                required
              />
              <p className="text-xs text-muted-foreground">
                Suggested from the dates. You can change it.
              </p>
            </div>

            {error && (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
              <Button variant="outline" type="button" asChild>
                <Link
                  href={`/dashboard/owner/properties/${params.propertyId}/overview`}
                >
                  Cancel
                </Link>
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Cycle
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
