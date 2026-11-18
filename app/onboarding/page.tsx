import type { Metadata } from "next";
import Link from "next/link";
import { BrandLockup } from "@/components/layout/brand-mark";
import { redirect } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BecomeOwnerCard } from "@/components/owner/onboarding/become-owner-card";
import { OnboardingProgress } from "@/components/owner/onboarding/onboarding-progress";
import { HouseStepForm } from "@/components/owner/onboarding/house-step-form";
import { TenantsStep, type OnboardingTenant } from "@/components/owner/onboarding/tenants-step";
import { FirstBillStepForm } from "@/components/owner/onboarding/first-bill-step-form";
import { SplitPreview, type SplitPreviewRow } from "@/components/owner/onboarding/split-preview";
import { FinishOnboardingButton } from "@/components/owner/onboarding/finish-onboarding-button";
import { defaultCycleDates, resolveOnboardingStep, type OnboardingStep } from "@/lib/onboarding/steps";

export const metadata: Metadata = { title: "Set up your house · FairSplit" };
export const dynamic = "force-dynamic";

const STEP_COPY: Record<OnboardingStep, { title: string; description: string }> = {
  house: { title: "Your house", description: "Name the house you rent out by the room. You can add the address later." },
  tenants: {
    title: "Who lives there",
    description: "Add each tenant with the date they moved in. Move-in dates decide how many days each person pays for.",
  },
  bill: {
    title: "Your first bill",
    description: "Enter one utility bill. FairSplit splits it by the days each tenant lived there.",
  },
  done: { title: "You're set up", description: "Here's how your first bill was split." },
};

export default async function OnboardingPage({ searchParams }: { searchParams: { step?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role, onboarding_completed")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/dashboard/admin/dashboard");

  if (profile.role === "tenant") {
    return (
      <Shell>
        <BecomeOwnerCard name={profile.full_name} email={profile.email} />
      </Shell>
    );
  }

  const { data: property } = await supabase
    .from("properties")
    .select("id, name, address_line1, city, state, zip_code")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Finished owners go to their dashboard unless they deliberately came back to a step.
  if (profile.onboarding_completed && property && !searchParams.step) redirect("/dashboard/owner/dashboard");

  const { data: tenantRows } = property
    ? await supabase
        .from("property_tenants")
        .select("id, display_name, email, join_date, invite_token, claimed_at, status")
        .eq("property_id", property.id)
        .neq("status", "departed")
        .order("created_at", { ascending: true })
    : { data: [] };
  const tenants: OnboardingTenant[] = (tenantRows ?? []).map((t) => ({
    id: t.id,
    display_name: t.display_name,
    email: t.email,
    join_date: t.join_date,
    invite_token: t.invite_token,
    claimed: Boolean(t.claimed_at),
  }));

  const { data: firstBill } = property
    ? await supabase
        .from("bills")
        .select("id, provider, category, amount_cents, service_start, service_end")
        .eq("property_id", property.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const progress = { hasProperty: Boolean(property), tenantCount: tenants.length, billCount: firstBill ? 1 : 0 };
  const step = resolveOnboardingStep(progress, searchParams.step);
  const { start, end } = defaultCycleDates();

  let splitRows: SplitPreviewRow[] = [];
  if (step === "done" && firstBill) {
    const { data: splits } = await supabase
      .from("bill_splits")
      .select("person_days, total_person_days, amount_cents, property_tenants(display_name)")
      .eq("bill_id", firstBill.id)
      .order("amount_cents", { ascending: false });
    splitRows = (splits ?? []).map((s) => {
      const pt = s.property_tenants as unknown as { display_name: string } | { display_name: string }[] | null;
      const name = Array.isArray(pt) ? pt[0]?.display_name : pt?.display_name;
      return {
        name: name ?? "Tenant",
        personDays: s.person_days,
        totalPersonDays: s.total_person_days,
        amountCents: s.amount_cents,
      };
    });
  }

  const copy = STEP_COPY[step];
  return (
    <Shell>
      <OnboardingProgress
        current={step}
        completed={{ house: progress.hasProperty, tenants: tenants.length > 0, bill: Boolean(firstBill) }}
        reachable={{ house: true, tenants: progress.hasProperty, bill: progress.hasProperty, done: true }}
      />
      <Card>
        <CardHeader>
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight">
            {copy.title}
          </h1>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "house" && <HouseStepForm property={property} />}
          {step === "tenants" && property && (
            <TenantsStep propertyId={property.id} tenants={tenants} defaultJoinDate={start} />
          )}
          {step === "bill" && property && (
            <FirstBillStepForm
              propertyId={property.id}
              defaultStart={start}
              defaultEnd={end}
              tenantCount={tenants.length}
            />
          )}
          {step === "done" && (
            <div className="space-y-6">
              {firstBill ? (
                <SplitPreview
                  provider={firstBill.provider}
                  category={firstBill.category}
                  amountCents={firstBill.amount_cents}
                  serviceStart={firstBill.service_start}
                  serviceEnd={firstBill.service_end}
                  rows={splitRows}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  You can add houses, tenants and bills any time from your dashboard.
                </p>
              )}
              <div className="flex items-start gap-3 rounded-lg border bg-primary/5 p-4">
                <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="text-sm">
                  <p className="font-medium">What&apos;s next</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                    {tenants.some((t) => !t.claimed) && <li>Send each tenant their invite link so they can see their share.</li>}
                    <li>Add the rest of this cycle&apos;s bills from the house page.</li>
                    <li>Mark shares as paid as your tenants pay you.</li>
                  </ul>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button asChild variant="ghost">
                  <Link href={progress.hasProperty ? "/onboarding?step=bill" : "/onboarding?step=house"}>Back</Link>
                </Button>
                <FinishOnboardingButton />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {step !== "done" && (
        <div className="text-center">
          <FinishOnboardingButton label="Finish later and go to my dashboard" variant="ghost" />
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-background px-4 py-6 sm:py-12">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <Link href="/" aria-label="FairSplit home" className="mx-auto block w-fit rounded-md">
          <BrandLockup />
        </Link>
        {children}
      </div>
    </main>
  );
}
