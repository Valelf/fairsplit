"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFrame } from "@/components/layout/auth-frame";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Loader2, CheckCircle2, KeyRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password login (for development)
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Fetch user role and redirect
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    const role = profile?.role || "tenant";

    if (role === "admin") {
      window.location.assign("/dashboard/admin/dashboard"); // full load: no cached layout from a previous session
    } else if (role === "owner") {
      window.location.assign("/dashboard/owner/dashboard"); // full load: no cached layout from a previous session
    } else {
      window.location.assign("/dashboard/tenant/dashboard"); // full load: no cached layout from a previous session
    }
  }

  // Magic link login (production)
  async function handleMagicLinkLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      title={sent ? undefined : "Sign in"}
      description={sent ? undefined : "See your bills, your share and who has paid."}
    >
        <div>
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle2 className="h-12 w-12 text-success" aria-hidden="true" />
              <div className="text-center">
                <p className="font-medium">Check your email</p>
                <p className="text-sm text-muted-foreground mt-1">
                  We sent a magic link to <strong>{email}</strong>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click the link in the email to sign in.
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                Try a different email
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="password" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="magic-link">Email link</TabsTrigger>
              </TabsList>

              <TabsContent value="password" className="mt-4">
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-password">Email address</Label>
                    <Input
                      id="email-password"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  {error && (
                    <p role="alert" className="text-sm text-destructive">{error}</p>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
                    )}
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="magic-link" className="mt-4">
                <form onSubmit={handleMagicLinkLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-magic">Email address</Label>
                    <Input
                      id="email-magic"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  {error && (
                    <p role="alert" className="text-sm text-destructive">{error}</p>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                    )}
                    Email me a sign-in link
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    No password required. We&apos;ll send you a secure login
                    link.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
    </AuthFrame>
  );
}
