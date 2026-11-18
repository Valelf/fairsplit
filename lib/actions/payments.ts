"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/server/notifications";
import { formatCents } from "@/lib/utils";

type ActionResult = { success: true; count?: number } | { error: string };

const cycleRef = z.object({
  cycleId: z.string().uuid(),
  propertyId: z.string().uuid(),
});

const markPaidSchema = cycleRef.extend({
  note: z.string().trim().max(500, "Note must be 500 characters or fewer").optional(),
});

const tenantPaymentSchema = cycleRef.extend({
  propertyTenantId: z.string().uuid(),
});

const dueDateSchema = cycleRef.extend({
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
    .nullable(),
});

function revalidatePaymentPaths(propertyId: string, cycleId: string) {
  revalidatePath(`/dashboard/tenant/properties/${propertyId}/bills/${cycleId}`);
  revalidatePath(`/dashboard/tenant/properties/${propertyId}/bills`);
  revalidatePath("/dashboard/tenant/dashboard");
  revalidatePath(`/dashboard/owner/properties/${propertyId}/cycles/${cycleId}`);
  revalidatePath("/dashboard/owner/payments");
  revalidatePath("/dashboard/owner/dashboard");
}

async function getUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Tenant: "I've paid" for all of their owed splits in a cycle. */
export async function markCyclePaid(input: z.infer<typeof markPaidSchema>): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = markPaidSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { cycleId, propertyId, note } = parsed.data;

  // propertyId is client-supplied and only used for the owner notification: it must be the
  // cycle's own property, or a tenant of two houses could notify the wrong landlord.
  const { data: ownCycle } = await supabase
    .from("billing_cycles")
    .select("id")
    .eq("id", cycleId)
    .eq("property_id", propertyId)
    .maybeSingle();
  if (!ownCycle) return { error: "Cycle not found" };

  const { data: count, error } = await supabase.rpc("mark_cycle_paid", {
    p_cycle_id: cycleId,
    p_note: note || null,
  });
  if (error) return { error: error.message };

  // Best-effort: tell the owner.
  const [{ data: property }, { data: cycle }, { data: tenant }] = await Promise.all([
    supabase.from("properties").select("owner_id, name").eq("id", propertyId).single(),
    supabase.from("billing_cycles").select("label").eq("id", cycleId).single(),
    supabase
      .from("property_tenants")
      .select("id, display_name")
      .eq("property_id", propertyId)
      .eq("tenant_id", user.id)
      .single(),
  ]);
  if (property?.owner_id && tenant) {
    const { data: splits } = await supabase
      .from("bill_splits")
      .select("amount_cents, bills!inner(cycle_id)")
      .eq("tenant_id", tenant.id)
      .eq("payment_status", "marked_paid")
      .eq("bills.cycle_id", cycleId);
    const amount = (splits ?? []).reduce((sum, s) => sum + s.amount_cents, 0);
    await createNotification(
      property.owner_id,
      "payment_marked",
      `${tenant.display_name} marked ${cycle?.label ?? "a cycle"} as paid`,
      `${formatCents(amount)} for ${property.name}. Confirm once you've received it.${note ? ` Note: ${note}` : ""}`,
      { cycleId, propertyId, propertyTenantId: tenant.id }
    );
  }

  revalidatePaymentPaths(propertyId, cycleId);
  return { success: true, count: count ?? undefined };
}

/** Tenant: undo "I've paid" (only while the owner hasn't confirmed). */
export async function unmarkCyclePaid(input: z.infer<typeof cycleRef>): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = cycleRef.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data: count, error } = await supabase.rpc("unmark_cycle_paid", {
    p_cycle_id: parsed.data.cycleId,
  });
  if (error) return { error: error.message };

  revalidatePaymentPaths(parsed.data.propertyId, parsed.data.cycleId);
  return { success: true, count: count ?? undefined };
}

/** Owner: confirm a tenant's payment for a cycle. */
export async function confirmTenantPayment(
  input: z.infer<typeof tenantPaymentSchema>
): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = tenantPaymentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { cycleId, propertyId, propertyTenantId } = parsed.data;

  const { data: count, error } = await supabase.rpc("confirm_tenant_cycle_payment", {
    p_cycle_id: cycleId,
    p_property_tenant_id: propertyTenantId,
  });
  if (error) return { error: error.message };

  const [{ data: tenant }, { data: cycle }] = await Promise.all([
    supabase.from("property_tenants").select("tenant_id").eq("id", propertyTenantId).single(),
    supabase.from("billing_cycles").select("label").eq("id", cycleId).single(),
  ]);
  if (tenant?.tenant_id) {
    await createNotification(
      tenant.tenant_id,
      "payment_confirmed",
      `Payment confirmed: ${cycle?.label ?? "billing cycle"}`,
      "Your landlord confirmed they received your payment.",
      { cycleId, propertyId }
    );
  }

  revalidatePaymentPaths(propertyId, cycleId);
  return { success: true, count: count ?? undefined };
}

/** Owner: reopen a tenant's payment for a cycle (back to owed). */
export async function reopenTenantPayment(
  input: z.infer<typeof tenantPaymentSchema>
): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = tenantPaymentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { cycleId, propertyId, propertyTenantId } = parsed.data;

  const { data: count, error } = await supabase.rpc("reopen_tenant_cycle_payment", {
    p_cycle_id: cycleId,
    p_property_tenant_id: propertyTenantId,
  });
  if (error) return { error: error.message };

  revalidatePaymentPaths(propertyId, cycleId);
  return { success: true, count: count ?? undefined };
}

/** Owner: set or clear a cycle's due date. */
export async function setCycleDueDate(input: z.infer<typeof dueDateSchema>): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = dueDateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { cycleId, propertyId, dueDate } = parsed.data;

  // RLS limits updates to the property owner; .select() lets us detect a silent no-op.
  const { data, error } = await supabase
    .from("billing_cycles")
    .update({ due_date: dueDate })
    .eq("id", cycleId)
    .eq("property_id", propertyId)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Cycle not found or access denied" };

  revalidatePaymentPaths(propertyId, cycleId);
  return { success: true };
}
