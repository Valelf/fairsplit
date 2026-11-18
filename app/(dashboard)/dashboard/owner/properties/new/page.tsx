"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProperty } from "@/lib/actions/properties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import Link from "next/link";

export default function NewPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const result = await createProperty({
      name: formData.get("name") as string,
      address_line1: formData.get("address_line1") as string,
      address_line2: (formData.get("address_line2") as string) || undefined,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      zip_code: formData.get("zip_code") as string,
      country: "US",
      timezone: formData.get("timezone") as string,
      transparency_level: formData.get("transparency_level") as "full" | "own_share",
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.data) {
      router.push(`/dashboard/owner/properties/${result.data.id}/overview`);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeading
        backHref="/dashboard/owner/properties"
        backLabel="Properties"
        title="Add Property"
        description="Create a new property to manage bills and tenants"
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Property Details</CardTitle>
          <CardDescription>
            Enter the property address and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Property Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. 575 McKinney"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input
                id="address_line1"
                name="address_line1"
                placeholder="Street address"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
              <Input
                id="address_line2"
                name="address_line2"
                placeholder="Apt, suite, unit"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" placeholder="City" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" placeholder="TX" required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="zip_code">ZIP Code</Label>
                <Input
                  id="zip_code"
                  name="zip_code"
                  placeholder="75070"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select name="timezone" defaultValue="America/Chicago">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern</SelectItem>
                    <SelectItem value="America/Chicago">Central</SelectItem>
                    <SelectItem value="America/Denver">Mountain</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transparency_level">Transparency Level</Label>
              <Select name="transparency_level" defaultValue="full">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">
                    Full — All tenants see everyone&apos;s breakdown
                  </SelectItem>
                  <SelectItem value="own_share">
                    Own Share — Tenants see only their portion
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
              <Button variant="outline" type="button" asChild>
                <Link href="/dashboard/owner/properties">Cancel</Link>
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Property
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
