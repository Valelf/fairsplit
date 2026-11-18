"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTenant } from "@/lib/actions/tenants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Check, Copy } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: { propertyId: string };
}

export default function InviteTenantPage({ params }: PageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ name: string; email: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

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

    if (result.error || !result.data) {
      setError(result.error ?? "Could not add tenant");
      setLoading(false);
      return;
    }
    setInvite({
      name: result.data.display_name,
      email: result.data.email,
      link: `${window.location.origin}/claim/${result.data.invite_token}`,
    });
    setLoading(false);
  }

  async function copyLink() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (invite) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{invite.name} added</CardTitle>
            <CardDescription>
              Send this link to {invite.email} by text or email. They sign in with that
              email address and see their share of each bill. The link works for 30 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite_link">Invite link</Label>
              <div className="flex gap-2">
                <Input id="invite_link" value={invite.link} readOnly onFocus={(e) => e.currentTarget.select()} />
                <Button type="button" variant="outline" onClick={copyLink} aria-label="Copy invite link">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="button" onClick={() => { setInvite(null); setCopied(false); }}>
                Add another tenant
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push(`/dashboard/owner/properties/${params.propertyId}/overview`)}>
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
            You&apos;ll get an invite link to send them.
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
