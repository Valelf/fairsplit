"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTenant } from "@/lib/actions/tenants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: { propertyId: string };
}

export default function InviteTenantPage({ params }: PageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const result = await addTenant({
      property_id: params.propertyId,
      email: formData.get("email") as string,
      display_name: formData.get("display_name") as string,
      join_date: formData.get("join_date") as string,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push(
        `/dashboard/owner/properties/${params.propertyId}/overview`
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
          <h1 className="text-2xl font-bold tracking-tight">Add Tenant</h1>
          <p className="text-muted-foreground">
            Add a tenant to this property
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Details</CardTitle>
          <CardDescription>
            The tenant will receive an invite email to claim their account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Full Name</Label>
              <Input
                id="display_name"
                name="display_name"
                placeholder="e.g. Navya"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tenant@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="join_date">Move-in Date</Label>
              <Input
                id="join_date"
                name="join_date"
                type="date"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Tenant
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
