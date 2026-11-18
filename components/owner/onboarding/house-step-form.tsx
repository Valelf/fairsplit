"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveOnboardingHouse } from "@/lib/actions/onboarding";
import { firstIssue, houseSchema } from "@/lib/onboarding/steps";

interface HouseStepFormProps {
  property?: {
    id: string;
    name: string;
    address_line1: string;
    city: string;
    state: string;
    zip_code: string;
  } | null;
}

/** Step 1: house name, with an optional address. */
export function HouseStepForm({ property }: HouseStepFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddress, setShowAddress] = useState(Boolean(property?.address_line1));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const input = {
      name: String(form.get("name") ?? ""),
      address_line1: String(form.get("address_line1") ?? ""),
      city: String(form.get("city") ?? ""),
      state: String(form.get("state") ?? ""),
      zip_code: String(form.get("zip_code") ?? ""),
    };
    const check = houseSchema.safeParse(input);
    if (!check.success) return setError(firstIssue(check.error));

    setLoading(true);
    const result = await saveOnboardingHouse({ ...input, property_id: property?.id ?? null });
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push("/onboarding?step=tenants");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">House name</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Maple Street house"
          defaultValue={property?.name ?? ""}
          required
          autoFocus
          aria-describedby="name-hint"
        />
        <p id="name-hint" className="text-xs text-muted-foreground">
          What you and your tenants call it. Shown on every bill.
        </p>
      </div>

      {showAddress ? (
        <fieldset className="space-y-4">
          <legend className="text-sm font-medium">Address (optional)</legend>
          <div className="space-y-2">
            <Label htmlFor="address_line1">Street address</Label>
            <Input id="address_line1" name="address_line1" defaultValue={property?.address_line1 ?? ""} autoComplete="street-address" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={property?.city ?? ""} autoComplete="address-level2" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" defaultValue={property?.state ?? ""} autoComplete="address-level1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip_code">ZIP</Label>
              <Input id="zip_code" name="zip_code" defaultValue={property?.zip_code ?? ""} autoComplete="postal-code" />
            </div>
          </div>
        </fieldset>
      ) : (
        <Button type="button" variant="link" className="h-auto px-0" onClick={() => setShowAddress(true)}>
          Add the address now (or add it later)
        </Button>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        {property ? (
          <Button asChild variant="ghost">
            <Link href="/onboarding?step=tenants">Skip for now</Link>
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          {property ? "Save and continue" : "Continue"}
        </Button>
      </div>
    </form>
  );
}
