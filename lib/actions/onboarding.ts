"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createBill } from "@/lib/actions/bills";
import {
  cycleLabel,
  firstBillSchema,
  firstIssue,
  houseSchema,
  parseDollarsToCents,
  type FirstBillInput,
  type HouseInput,
} from "@/lib/onboarding/steps";

type Result<T = undefined> = { error: string; data?: never } | { error?: never; data: T };

/** Promote the signed-in new account to owner. The RPC enforces who may do this. */
export async function becomeOwner(): Promise<Result<string>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("become_owner");
  if (error) return { error: error.message };
  revalidatePath("/onboarding");
  return { data: data as string };
}

async function requireOwner() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: "Not signed in" } as const;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner") return { supabase, user: null, error: "Set up your landlord account first" } as const;
  return { supabase, user, error: null } as const;
}

/** Step 1: create the owner's first house, or update it when they come back to this step. */
export async function saveOnboardingHouse(
  input: HouseInput & { property_id?: string | null }
): Promise<Result<{ id: string }>> {
  const { supabase, user, error: authError } = await requireOwner();
  if (!user) return { error: authError };

  const parsed = houseSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  if (input.property_id) {
    const { data, error } = await supabase
      .from("properties")
      .update(parsed.data)
      .eq("id", input.property_id)
      .eq("owner_id", user.id)
      .select("id")
      .single();
    if (error) return { error: error.message };
    revalidatePath("/onboarding");
    return { data };
  }

  // Address columns are NOT NULL; blank means "add later" (editable from the property page).
  const { data, error } = await supabase
    .from("properties")
    .insert({
      owner_id: user.id,
      ...parsed.data,
      address_line2: null,
      country: "US",
      timezone: "America/Chicago",
      transparency_level: "full",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/onboarding");
  revalidatePath("/dashboard/owner/dashboard");
  revalidatePath("/dashboard/owner/properties");
  return { data };
}

/**
 * Step 3: create the first billing cycle with real dates, then the first bill (reusing createBill,
 * which stores the person-days splits). Re-submitting reuses the cycle with the same dates.
 */
export async function createFirstCycleAndBill(input: FirstBillInput): Promise<Result<{ billId: string }>> {
  const { supabase, user, error: authError } = await requireOwner();
  if (!user) return { error: authError };

  const parsed = firstBillSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  const amountCents = parseDollarsToCents(v.amount);
  if (!amountCents) return { error: "Enter the bill amount, like 142.50" };

  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", v.property_id)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .single();
  if (!property) return { error: "House not found" };

  const { data: existing } = await supabase
    .from("billing_cycles")
    .select("id")
    .eq("property_id", v.property_id)
    .eq("start_date", v.cycle_start)
    .eq("end_date", v.cycle_end)
    .limit(1)
    .maybeSingle();

  let cycleId = existing?.id;
  if (!cycleId) {
    const { data: cycle, error: cycleError } = await supabase
      .from("billing_cycles")
      .insert({
        property_id: v.property_id,
        label: cycleLabel(v.cycle_start, v.cycle_end),
        status: "draft",
        start_date: v.cycle_start,
        end_date: v.cycle_end,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (cycleError) return { error: cycleError.message };
    cycleId = cycle.id;
  }

  const bill = await createBill({
    cycle_id: cycleId,
    property_id: v.property_id,
    category: v.category,
    provider: v.provider,
    amount_cents: amountCents,
    service_start: v.service_start,
    service_end: v.service_end,
    source: "manual",
  });
  if (bill.error || !bill.data) return { error: bill.error ?? "Could not save the bill" };

  revalidatePath("/onboarding");
  revalidatePath("/dashboard/owner/dashboard");
  return { data: { billId: bill.data.id } };
}

/** Step 4: mark onboarding finished. */
export async function completeOnboarding(): Promise<Result<null>> {
  const { supabase, user, error: authError } = await requireOwner();
  if (!user) return { error: authError };
  const { error } = await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/owner/dashboard");
  return { data: null };
}
