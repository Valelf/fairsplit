"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, Mail } from "lucide-react";

type ClaimState = "loading" | "found" | "not_found" | "already_claimed" | "sending" | "sent" | "error";

export default function ClaimInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [state, setState] = useState<ClaimState>("loading");
  const [tenantRecord, setTenantRecord] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkToken() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("property_tenants")
        .select("*, properties(name)")
        .eq("invite_token", token)
        .single();

      if (error || !data) {
        setState("not_found");
        return;
      }

      if (data.claimed_at) {
        setState("already_claimed");
        return;
      }

      setTenantRecord(data);
      setEmail(data.email);
      setState("found");
    }

    checkToken();
  }, [token]);

  async function handleClaim() {
    setState("sending");
    setError(null);

    const supabase = createClient();

    // Send magic link to the tenant's email
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?claim=${token}`,
        data: {
          full_name: tenantRecord.display_name,
          role: "tenant",
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setState("error");
      return;
    }

    setState("sent");
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === "not_found") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h2 className="mt-4 text-lg font-semibold">Invite Not Found</h2>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              This invite link is invalid or has expired. Ask your landlord to
              send a new invite.
            </p>
            <Button className="mt-4" onClick={() => router.push("/login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "already_claimed") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h2 className="mt-4 text-lg font-semibold">Already Claimed</h2>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              This invite has already been claimed. Sign in to access your
              dashboard.
            </p>
            <Button className="mt-4" onClick={() => router.push("/login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h2 className="mt-4 text-lg font-semibold">Check Your Email</h2>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              We sent a magic link to <strong>{email}</strong>. Click it to
              complete your account setup and access your bills.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Welcome to FairSplit
          </CardTitle>
          <CardDescription>
            You&apos;ve been invited to join{" "}
            <strong>{(tenantRecord?.properties as any)?.name || "a property"}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted/50">
            <p className="text-sm font-medium">
              Hi {tenantRecord?.display_name},
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Your landlord has added you as a tenant. Claim your invite to
              view your bill breakdown and track your share of utilities.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Your Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled
            />
            <p className="text-xs text-muted-foreground">
              This is the email your landlord used to invite you.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            className="w-full"
            onClick={handleClaim}
            disabled={state === "sending"}
          >
            {state === "sending" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Claim Invite & Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
