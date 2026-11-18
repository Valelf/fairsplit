"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCycle } from "@/lib/actions/cycles";
import { nextCycleDates, suggestCycleLabel } from "@/lib/owner/cycle-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: { propertyId: string };
}

export default function NewCyclePage({ params }: PageProps) {
  const router = useRouter();
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
      router.push(
        `/dashboard/owner/properties/${params.propertyId}/cycles/${result.data.id}`
      );
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link
            href={`/dashboard/owner/properties/${params.propertyId}/overview`}
            aria-label="Back to property"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Billing Cycle</h1>
          <p className="text-muted-foreground">
            Create a new billing cycle for this property
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cycle Details</CardTitle>
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
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Cycle
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link
                  href={`/dashboard/owner/properties/${params.propertyId}/overview`}
                >
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
