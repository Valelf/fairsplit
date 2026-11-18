"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Home, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { becomeOwner } from "@/lib/actions/onboarding";

interface BecomeOwnerCardProps {
  name: string;
  email: string;
}

/** First screen for a brand-new account: confirm they're a landlord (calls become_owner). */
export function BecomeOwnerCard({ name, email }: BecomeOwnerCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setLoading(true);
    setError(null);
    const result = await becomeOwner();
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.replace("/onboarding?step=house");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Welcome, {name}</CardTitle>
        <CardDescription>
          You&apos;re signed in as <strong>{email}</strong>. Let&apos;s set up your first house. It takes
          about five minutes: your house, who lives there, and one bill.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
          Landlord accounts can add houses, invite tenants and split bills. If you&apos;re a tenant, you
          don&apos;t need this: use the invite link your landlord sent you.
        </div>
        {error && (
          <p className="flex items-start gap-2 text-sm text-destructive" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        <Button className="w-full" onClick={confirm} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Home className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Set up my landlord account
        </Button>
      </CardContent>
    </Card>
  );
}
