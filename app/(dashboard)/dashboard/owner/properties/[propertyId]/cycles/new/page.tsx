"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCycle } from "@/lib/actions/cycles";
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const result = await createCycle({
      property_id: params.propertyId,
      label: formData.get("label") as string,
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
            A billing cycle groups related bills together (e.g. &quot;Sept – Oct 2025&quot;).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Cycle Label</Label>
              <Input
                id="label"
                name="label"
                placeholder="e.g. Sept – Oct 2025"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

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
