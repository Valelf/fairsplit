"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, Mail } from "lucide-react";

type Invite = {
  property_name: string;
  display_name: string;
  email: string;
  invite_status: "valid" | "claimed" | "expired" | "invalid";
};

type ClaimState =
  | "loading"
  | "found"
  | "not_found"
  | "expired"
  | "already_claimed"
  | "sending"
  | "sent"
  | "claiming"
  | "error";

/**
 * Invite claim flow:
 * 1. Look up the invite with the public get_invite RPC (no table access needed).
 * 2. Not signed in → send a magic link that returns to this page (/auth/confirm?next=/claim/<token>).
 * 3. Signed in → claim_invite RPC links the tenant record to this account (email must match).
 */
export default function ClaimInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [state, setState] = useState<ClaimState>("loading");
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);

  const claim = useCallback(async () => {
    setState("claiming");
    const supabase = createClient();
    const { error: claimError } = await supabase.rpc("claim_invite", { p_token: token });
    if (claimError) {
      setError(claimError.message);
      setState("error");
      return;
    }
    router.replace("/dashboard/tenant/dashboard");
  }, [router, token]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error: lookupError } = await supabase.rpc("get_invite", { p_token: token });
      const row = (data as Invite[] | null)?.[0];
      if (lookupError || !row || row.invite_status === "invalid") {
        setState("not_found");
        return;
      }
      setInvite(row);
      if (row.invite_status === "expired") return setState("expired");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (row.invite_status === "claimed") {
        // Re-visiting your own claimed invite just takes you to your bills.
        if (user && user.email?.toLowerCase() === row.email.toLowerCase()) {
          router.replace("/dashboard/tenant/dashboard");
          return;
        }
        return setState("already_claimed");
      }
      if (user) {
        if (user.email?.toLowerCase() === row.email.toLowerCase()) return claim();
        setError(`You're signed in as ${user.email}, but this invite is for ${row.email}. Sign out and use the invited email.`);
        return setState("error");
      }
      setState("found");
    }
    load();
  }, [token, claim, router]);

  async function sendLink() {
    if (!invite) return;
    setState("sending");
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: invite.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(`/claim/${token}`)}`,
        data: { full_name: invite.display_name },
      },
    });
    if (authError) {
      setError(authError.message);
      setState("error");
      return;
    }
    setState("sent");
  }

  if (state === "loading" || state === "claiming") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          {state === "claiming" ? "Linking your account…" : "Checking your invite…"}
        </p>
      </div>
    );
  }

  const message = (
    icon: React.ReactNode,
    title: string,
    body: React.ReactNode,
    action = true
  ) => (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center py-8 text-center">
          {icon}
          <h1 className="mt-4 text-lg font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          {action && (
            <Button className="mt-4" onClick={() => router.push("/login")}>
              Go to sign in
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (state === "not_found")
    return message(
      <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />,
      "Invite not found",
      "This invite link isn't valid. Ask your landlord to send a new one."
    );
  if (state === "expired")
    return message(
      <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />,
      "Invite expired",
      "This invite has expired. Ask your landlord to send a new one."
    );
  if (state === "already_claimed")
    return message(
      <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden="true" />,
      "Already claimed",
      "This invite has already been used. Sign in with the invited email to see your bills."
    );
  if (state === "sent")
    return message(
      <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden="true" />,
      "Check your email",
      <>
        We sent a sign-in link to <strong>{invite?.email}</strong>. Open it on this device to finish
        joining {invite?.property_name}.
      </>,
      false
    );
  if (state === "error")
    return message(
      <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />,
      "Couldn't claim this invite",
      error ?? "Something went wrong. Try the link again."
    );

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to FairSplit</CardTitle>
          <CardDescription>
            You&apos;ve been invited to <strong>{invite?.property_name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm font-medium">Hi {invite?.display_name},</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your landlord uses FairSplit to share utility bills. You&apos;ll see your share of each
              bill and exactly how it was worked out.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Invited email</Label>
            <Input id="email" type="email" value={invite?.email ?? ""} disabled readOnly />
          </div>
          <Button className="w-full" onClick={sendLink} disabled={state === "sending"}>
            {state === "sending" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Email me a sign-in link
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
