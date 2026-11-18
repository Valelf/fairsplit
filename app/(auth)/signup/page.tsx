"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFrame } from "@/components/layout/auth-frame";
import { CheckCircle2, Loader2, Mail } from "lucide-react";

const signupSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

/**
 * Landlord sign-up. Magic link only: the link lands on /auth/confirm, which continues to
 * /onboarding, where the new account becomes an owner (become_owner RPC) and sets up a house.
 * Tenants never sign up here; they join through the invite link their landlord sends.
 */
export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = signupSchema.safeParse({ full_name: fullName, email });
    if (!parsed.success) return setError(parsed.error.issues[0].message);

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding`,
        data: { full_name: parsed.data.full_name },
      },
    });
    setLoading(false);
    if (authError) return setError(authError.message);
    setSent(true);
  }

  return (
    <AuthFrame
      title={sent ? undefined : "Create your landlord account"}
      description={sent ? undefined : "Split utility bills fairly, by the days each tenant lived there"}
    >
        <div>
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center" role="status">
              <CheckCircle2 className="h-12 w-12 text-success" aria-hidden="true" />
              <div>
                <h1 className="font-display text-2xl font-semibold">Check your email</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  We sent a sign-in link to <strong>{email.trim()}</strong>. Open it on this device to set up
                  your first house.
                </p>
              </div>
              <Button variant="ghost" onClick={() => setSent(false)}>
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="full_name">Your name</Label>
                <Input
                  id="full_name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button type="submit" className="h-auto min-h-10 w-full whitespace-normal py-2" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                I&apos;m a landlord, email me a sign-up link
              </Button>
              <p className="text-center text-xs text-muted-foreground">No password needed.</p>

              <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
                <strong className="text-foreground">Renting a room?</strong> You don&apos;t need to sign up.
                Your landlord sends you an invite link; open it to see your bills.
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="rounded-sm font-medium text-foreground underline underline-offset-4 hover:text-primary">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
    </AuthFrame>
  );
}
