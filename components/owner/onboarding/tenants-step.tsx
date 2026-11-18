"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { addTenant } from "@/lib/actions/tenants";
import { firstIssue, tenantSchema } from "@/lib/onboarding/steps";
import { formatDate } from "@/lib/utils";
import { CopyInviteLink } from "./copy-invite-link";

export interface OnboardingTenant {
  id: string;
  display_name: string;
  email: string;
  join_date: string;
  invite_token: string;
  claimed: boolean;
}

interface TenantsStepProps {
  propertyId: string;
  tenants: OnboardingTenant[];
  defaultJoinDate: string;
}

/** Step 2: add tenants with move-in dates; each gets a copyable invite link. */
export function TenantsStep({ propertyId, tenants, defaultJoinDate }: TenantsStepProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const check = tenantSchema.safeParse({
      display_name: String(form.get("display_name") ?? ""),
      email: String(form.get("email") ?? ""),
      join_date: String(form.get("join_date") ?? ""),
    });
    if (!check.success) return setError(firstIssue(check.error));

    setLoading(true);
    const result = await addTenant({ property_id: propertyId, ...check.data });
    setLoading(false);
    if (result.error) return setError(result.error);
    formRef.current?.reset();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {tenants.length > 0 && (
        <section aria-labelledby="added-tenants" className="space-y-3">
          <h2 id="added-tenants" className="text-sm font-medium">
            Added so far
          </h2>
          <ul className="space-y-3">
            {tenants.map((t) => (
              <li key={t.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{t.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.email} · moved in {formatDate(t.join_date)}
                    </p>
                  </div>
                  <Badge variant={t.claimed ? "default" : "secondary"}>{t.claimed ? "Joined" : "Invited"}</Badge>
                </div>
                {!t.claimed && <CopyInviteLink token={t.invite_token} label={`Invite link for ${t.display_name}`} />}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Text or email each person their link. They sign in with that email to see their share. Links
            work for 30 days. Their shares are worked out from move-in dates even before they join.
          </p>
        </section>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4" noValidate>
        <h2 className="text-sm font-medium">{tenants.length ? "Add another tenant" : "Add a tenant"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="display_name">Name</Label>
            <Input id="display_name" name="display_name" placeholder="e.g. Ana" required autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="ana@example.com" required autoComplete="off" />
          </div>
        </div>
        <div className="space-y-2 sm:w-1/2">
          <Label htmlFor="join_date">Move-in date</Label>
          <Input id="join_date" name="join_date" type="date" defaultValue={defaultJoinDate} required />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" variant={tenants.length ? "outline" : "default"} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Add tenant
        </Button>
      </form>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button asChild variant="ghost">
          <Link href="/onboarding?step=house">Back</Link>
        </Button>
        <Button asChild variant={tenants.length ? "default" : "ghost"}>
          <Link href="/onboarding?step=bill">{tenants.length ? "Continue" : "Skip for now"}</Link>
        </Button>
      </div>
    </div>
  );
}
