"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { createNotification } from "@/lib/server/notifications";
import { recalculatePropertySplits } from "@/lib/server/splits";
import { revalidatePropertyPages } from "@/lib/server/revalidate";
import { earliestAffectedDate, previewTenantDateChange } from "@/lib/owner/departure";

const addTenantSchema = z.object({
  property_id: z.string().uuid(),
  email: z.string().email("Valid email is required"),
  display_name: z.string().min(1, "Name is required"),
  join_date: z.string().min(1, "Join date is required"),
});

export type AddTenantInput = z.infer<typeof addTenantSchema>;

export async function addTenant(input: AddTenantInput) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = addTenantSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Verify user owns this property
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", parsed.data.property_id)
    .eq("owner_id", user.id)
    .single();

  if (!property) {
    return { error: "Property not found or access denied" };
  }

  // Check if tenant already exists for this property
  const { data: existing } = await supabase
    .from("property_tenants")
    .select("id")
    .eq("property_id", parsed.data.property_id)
    .eq("email", parsed.data.email)
    .neq("status", "departed")
    .single();

  if (existing) {
    return { error: "This email is already associated with this property" };
  }

  const { data, error } = await supabase
    .from("property_tenants")
    .insert({
      property_id: parsed.data.property_id,
      tenant_id: null,
      email: parsed.data.email,
      display_name: parsed.data.display_name,
      join_date: parsed.data.join_date,
      leave_date: null,
      status: "invited" as const,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // If tenant already has an account (claimed), notify them
  if (data.tenant_id) {
    const { data: propertyData } = await supabase
      .from("properties")
      .select("name")
      .eq("id", parsed.data.property_id)
      .single();

    await createNotification(
      data.tenant_id,
      "tenant_invited",
      `You've been added to ${propertyData?.name || "a property"}`,
      `You have been added as a tenant. View your bills and splits.`,
      { propertyId: parsed.data.property_id, propertyName: propertyData?.name }
    );
  }

  // A new tenant changes the split of any existing bill that overlaps their stay.
  const recalcError = await recalculatePropertySplits(parsed.data.property_id, parsed.data.join_date);
  if (recalcError) {
    return { error: `Tenant added, but re-splitting bills failed: ${recalcError}` };
  }

  revalidatePropertyPages(parsed.data.property_id);

  return { data };
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

/** Load a tenant record and confirm the signed-in user owns its (non-deleted) property. */
async function loadOwnedTenant(tenantRecordId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const id = z.string().uuid().safeParse(tenantRecordId);
  if (!id.success) return { ok: false as const, error: "Invalid tenant" };

  const { data: tenant } = await supabase
    .from("property_tenants")
    .select("*")
    .eq("id", id.data)
    .single();
  if (!tenant) return { ok: false as const, error: "Tenant not found" };

  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", tenant.property_id)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .single();
  if (!property) return { ok: false as const, error: "Property not found or access denied" };

  return { ok: true as const, supabase, tenant };
}

const updateTenantSchema = z
  .object({
    display_name: z.string().trim().min(1, "Name is required").max(100),
    email: z.string().trim().email("Valid email is required"),
    join_date: isoDate,
    leave_date: isoDate.nullable(),
  })
  .refine((v) => !v.leave_date || v.join_date <= v.leave_date, {
    message: "Leave date can't be before the join date",
  });

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

/** Edit a tenant. Email can only change while the invite is unclaimed. Date changes re-split bills. */
export async function updateTenant(tenantRecordId: string, input: UpdateTenantInput) {
  const loaded = await loadOwnedTenant(tenantRecordId);
  if (!loaded.ok) return { error: loaded.error };
  const { supabase, tenant } = loaded;

  const parsed = updateTenantSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const claimed = !!tenant.claimed_at || !!tenant.tenant_id;
  const emailChanged = v.email.toLowerCase() !== tenant.email.toLowerCase();
  if (emailChanged && claimed) {
    return { error: "Email can't be changed after the tenant has claimed their invite" };
  }

  const datesChanged = v.join_date !== tenant.join_date || v.leave_date !== tenant.leave_date;
  let status = tenant.status;
  if (v.leave_date === null && status === "departed") status = claimed ? "active" : "invited";

  const { error } = await supabase
    .from("property_tenants")
    .update({
      display_name: v.display_name,
      email: emailChanged ? v.email : tenant.email,
      join_date: v.join_date,
      leave_date: v.leave_date,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenant.id);
  if (error) {
    if (error.code === "23505") return { error: "Another tenant on this property already uses that email" };
    return { error: error.message };
  }

  if (datesChanged) {
    const from = earliestAffectedDate([tenant.join_date, v.join_date, tenant.leave_date, v.leave_date]);
    const recalcError = await recalculatePropertySplits(tenant.property_id, from);
    if (recalcError) return { error: `Tenant saved, but re-splitting bills failed: ${recalcError}` };
  }

  revalidatePropertyPages(tenant.property_id);
  return { success: true, recalculated: datesChanged };
}

/** New invite token + fresh 30-day expiry. Only for unclaimed invites. */
export async function regenerateInvite(tenantRecordId: string) {
  const loaded = await loadOwnedTenant(tenantRecordId);
  if (!loaded.ok) return { error: loaded.error };
  const { supabase, tenant } = loaded;

  if (tenant.claimed_at || tenant.tenant_id) return { ok: false as const, error: "This invite has already been claimed" };
  if (tenant.status === "departed") return { ok: false as const, error: "This tenant has departed" };

  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("property_tenants")
    .update({ invite_token: token, invite_expires_at: expires, invited_at: new Date().toISOString() })
    .eq("id", tenant.id);
  if (error) return { error: error.message };

  revalidatePropertyPages(tenant.property_id);
  return { data: { invite_token: token, invite_expires_at: expires } };
}

/**
 * Proration preview: the tenant's share of each bill before vs. after a change to their dates,
 * using the same algorithm (and tenant order) as the database recalculation.
 */
export async function previewTenantDates(
  tenantRecordId: string,
  change: { joinDate?: string; leaveDate?: string | null }
) {
  const loaded = await loadOwnedTenant(tenantRecordId);
  if (!loaded.ok) return { error: loaded.error };
  const { supabase, tenant } = loaded;

  if (change.joinDate !== undefined && !isoDate.safeParse(change.joinDate).success) {
    return { error: "Use a valid date" };
  }
  if (change.leaveDate && !isoDate.safeParse(change.leaveDate).success) {
    return { error: "Use a valid date" };
  }

  const [{ data: tenants }, { data: bills }, { data: cycles }] = await Promise.all([
    supabase.from("property_tenants").select("id, join_date, leave_date").eq("property_id", tenant.property_id),
    supabase
      .from("bills")
      .select("id, cycle_id, category, provider, amount_cents, service_start, service_end")
      .eq("property_id", tenant.property_id)
      .order("service_start"),
    supabase.from("billing_cycles").select("id, label").eq("property_id", tenant.property_id),
  ]);
  const cycleLabel = new Map((cycles ?? []).map((c) => [c.id, c.label]));

  const rows = previewTenantDateChange(
    (bills ?? []).map((b) => ({
      billId: b.id,
      label: `${cycleLabel.get(b.cycle_id) ?? ""} · ${b.provider} (${b.category})`,
      amountCents: b.amount_cents,
      serviceStart: b.service_start,
      serviceEnd: b.service_end,
    })),
    (tenants ?? []).map((t) => ({ tenantId: t.id, joinDate: t.join_date, leaveDate: t.leave_date })),
    tenant.id,
    change
  );
  return { data: rows };
}

export async function markTenantDeparted(tenantRecordId: string, leaveDate: string) {
  const loaded = await loadOwnedTenant(tenantRecordId);
  if (!loaded.ok) return { error: loaded.error };
  const { supabase, tenant } = loaded;

  const date = isoDate.safeParse(leaveDate);
  if (!date.success) return { ok: false as const, error: "Use a valid leave date" };
  if (date.data < tenant.join_date) return { ok: false as const, error: "Leave date can't be before the join date" };

  const { error } = await supabase
    .from("property_tenants")
    .update({ status: "departed", leave_date: date.data, updated_at: new Date().toISOString() })
    .eq("id", tenant.id);
  if (error) return { error: error.message };

  const from = earliestAffectedDate([date.data, tenant.leave_date]);
  const recalcError = await recalculatePropertySplits(tenant.property_id, from);
  if (recalcError) {
    return { error: `Tenant marked departed, but re-splitting bills failed: ${recalcError}` };
  }

  revalidatePropertyPages(tenant.property_id);
  return { success: true };
}
