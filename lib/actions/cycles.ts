"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { createNotification } from "@/lib/server/notifications";

const createCycleSchema = z.object({
  property_id: z.string().uuid(),
  label: z.string().min(1, "Cycle label is required"),
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
    .single();

  if (!property) {
    return { error: "Property not found or access denied" };
  }

  const { data, error } = await supabase
    .from("billing_cycles")
    .insert({
      property_id: parsed.data.property_id,
      label: parsed.data.label,
      status: "draft",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/owner/properties/${parsed.data.property_id}`);

  return { data };
}

export async function closeCycle(cycleId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("billing_cycles")
    .update({ status: "closed" })
    .eq("id", cycleId)
    .select("property_id")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Notify all property tenants that the cycle is closed
  const { data: tenants } = await supabase
    .from("property_tenants")
    .select("tenant_id")
    .eq("property_id", data.property_id)
    .in("status", ["active"])
    .not("tenant_id", "is", null);

  const { data: cycle } = await supabase
    .from("billing_cycles")
    .select("label")
    .eq("id", cycleId)
    .single();

  if (tenants) {
    for (const tenant of tenants) {
      if (tenant.tenant_id) {
        await createNotification(
          tenant.tenant_id,
          "cycle_closed",
          `Billing cycle closed: ${cycle?.label || ""}`,
          "A billing cycle has been finalized. Check your bills for the final amounts.",
          {
            cycleId,
            propertyId: data.property_id,
            cycleName: cycle?.label,
          }
        );
      }
    }
  }

  revalidatePath(`/dashboard/owner/properties/${data.property_id}`);

  return { success: true };
}

export async function deleteCycle(cycleId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get property_id before delete
  const { data: cycle } = await supabase
    .from("billing_cycles")
    .select("property_id")
    .eq("id", cycleId)
    .single();

  if (!cycle) {
    return { error: "Cycle not found" };
  }

  const { error } = await supabase
    .from("billing_cycles")
    .delete()
    .eq("id", cycleId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/owner/properties/${cycle.property_id}`);

  return { success: true };
}
