"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { createNotification } from "@/lib/server/notifications";
import { revalidatePropertyPages } from "@/lib/server/revalidate";
import { recalculateBillSplits } from "@/lib/server/splits";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

const createCycleSchema = z
  .object({
    property_id: z.string().uuid(),
    label: z.string().trim().min(1, "Cycle label is required").max(80),
    start_date: isoDate.optional().nullable(),
    end_date: isoDate.optional().nullable(),
  })
  .refine((v) => !v.start_date || !v.end_date || v.start_date <= v.end_date, {
    message: "End date can't be before the start date",
  });

export type CreateCycleInput = z.infer<typeof createCycleSchema>;

export async function createCycle(input: CreateCycleInput) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = createCycleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Verify ownership
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", parsed.data.property_id)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!property) {
    return { error: "Property not found or access denied" };
  }

  const { data, error } = await supabase
    .from("billing_cycles")
    .insert({
      property_id: parsed.data.property_id,
      label: parsed.data.label,
      start_date: parsed.data.start_date ?? null,
      end_date: parsed.data.end_date ?? null,
      status: "draft",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePropertyPages(parsed.data.property_id);

  return { data };
}

/** Load a cycle and confirm the signed-in user owns its property. */
async function loadOwnedCycle(cycleId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const id = z.string().uuid().safeParse(cycleId);
  if (!id.success) return { ok: false as const, error: "Invalid cycle" };

  const { data: cycle } = await supabase
    .from("billing_cycles")
    .select("*")
    .eq("id", id.data)
    .single();
  if (!cycle) return { ok: false as const, error: "Cycle not found" };

  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", cycle.property_id)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .single();
  if (!property) return { ok: false as const, error: "Property not found or access denied" };

  return { ok: true as const, supabase, cycle };
}

export async function closeCycle(cycleId: string) {
  const loaded = await loadOwnedCycle(cycleId);
  if (!loaded.ok) return { error: loaded.error };
  const { supabase, cycle } = loaded;

  if (cycle.status === "closed") return { ok: false as const, error: "This cycle is already closed" };

  const { error } = await supabase
    .from("billing_cycles")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", cycle.id);

  if (error) {
    return { error: error.message };
  }

  // Notify all property tenants that the cycle is closed
  const { data: tenants } = await supabase
    .from("property_tenants")
    .select("tenant_id")
    .eq("property_id", cycle.property_id)
    .in("status", ["active"])
    .not("tenant_id", "is", null);

  if (tenants) {
    for (const tenant of tenants) {
      if (tenant.tenant_id) {
        await createNotification(
          tenant.tenant_id,
          "cycle_closed",
          `Billing cycle closed: ${cycle.label}`,
          "A billing cycle has been finalized. Check your bills for the final amounts.",
          {
            cycleId: cycle.id,
            propertyId: cycle.property_id,
            cycleName: cycle.label,
          }
        );
      }
    }
  }

  revalidatePropertyPages(cycle.property_id);

  return { success: true };
}

/** Reopen a closed cycle so its bills can be edited again. */
export async function reopenCycle(cycleId: string) {
  const loaded = await loadOwnedCycle(cycleId);
  if (!loaded.ok) return { error: loaded.error };
  const { supabase, cycle } = loaded;

  if (cycle.status !== "closed") return { ok: false as const, error: "This cycle isn't closed" };

  const { error } = await supabase
    .from("billing_cycles")
    .update({ status: "open", updated_at: new Date().toISOString() })
    .eq("id", cycle.id);
  if (error) return { error: error.message };

  // Tenant-date changes skip closed cycles; catch this cycle's splits up now that it's open.
  const { data: bills } = await supabase.from("bills").select("id").eq("cycle_id", cycle.id);
  for (const bill of bills ?? []) {
    const splitError = await recalculateBillSplits(bill.id);
    if (splitError) return { error: `Cycle reopened, but re-splitting bills failed: ${splitError}` };
  }

  revalidatePropertyPages(cycle.property_id);
  return { success: true };
}

export async function deleteCycle(cycleId: string) {
  const loaded = await loadOwnedCycle(cycleId);
  if (!loaded.ok) return { error: loaded.error };
  const { supabase, cycle } = loaded;

  const { error } = await supabase
    .from("billing_cycles")
    .delete()
    .eq("id", cycle.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePropertyPages(cycle.property_id);

  return { success: true };
}
