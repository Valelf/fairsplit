"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminForAction } from "@/lib/server/admin-guard";
import { COMP_PRESETS, computeCompUntil, todayUTC } from "@/lib/admin/comp";

function revalidateAdmin(userId?: string) {
  revalidatePath("/dashboard/admin", "layout");
  if (userId) revalidatePath(`/dashboard/admin/users/${userId}`);
}

// ------------------------------------------------------------
// Roles
// ------------------------------------------------------------

const changeRoleSchema = z.object({
  userId: z.string().uuid(),
  newRole: z.enum(["admin", "owner", "tenant"]),
});

export async function changeUserRole(input: z.infer<typeof changeRoleSchema>) {
  const admin = await getAdminForAction();
  if ("error" in admin) return { error: admin.error };
  const { supabase, userId: actorId } = admin;

  const parsed = changeRoleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (parsed.data.userId === actorId) {
    return { error: "You can't change your own role. Ask another admin." };
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", parsed.data.userId)
    .single();
  if (!target) return { error: "User not found" };
  if (target.role === parsed.data.newRole) return { success: true };

  // RLS ("Admins can update any profile") + guard_profile_update trigger allow this for admins only.
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: parsed.data.newRole })
    .eq("id", parsed.data.userId);
  if (updateError) return { error: updateError.message };

  await supabase.from("audit_log").insert({
    user_id: actorId,
    action: "change_role",
    table_name: "profiles",
    record_id: parsed.data.userId,
    old_data: { role: target.role, email: target.email, full_name: target.full_name },
    new_data: { role: parsed.data.newRole },
    ip_address: null,
  });

  revalidateAdmin(parsed.data.userId);
  return { success: true };
}

// ------------------------------------------------------------
// Founding / comped plans
// ------------------------------------------------------------

const compFields = {
  preset: z.enum(COMP_PRESETS),
  date: z.string().optional().nullable(),
  note: z.string().trim().max(500, "Note is too long (500 characters max)").optional(),
};

const updateCompSchema = z.object({
  subscriptionId: z.string().uuid(),
  ...compFields,
});

export async function updateSubscriptionComp(input: z.infer<typeof updateCompSchema>) {
  const admin = await getAdminForAction();
  if ("error" in admin) return { error: admin.error };
  const { supabase, userId: actorId } = admin;

  const parsed = updateCompSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { subscriptionId, preset, date, note } = parsed.data;

  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("id, user_id, comp_until, comp_note")
    .eq("id", subscriptionId)
    .single();
  if (!sub) return { error: "Subscription not found" };

  const result = computeCompUntil(preset, sub.comp_until ?? null, todayUTC(), date);
  if ("error" in result) return { error: result.error };

  const newNote = note ? note : sub.comp_note ?? null;

  const { error } = await supabase
    .from("user_subscriptions")
    .update({ comp_until: result.value, comp_note: newNote, updated_at: new Date().toISOString() })
    .eq("id", subscriptionId);
  if (error) return { error: error.message };

  await supabase.from("audit_log").insert({
    user_id: actorId,
    action: preset === "clear" ? "end_comp" : "extend_comp",
    table_name: "user_subscriptions",
    record_id: subscriptionId,
    old_data: { user_id: sub.user_id, comp_until: sub.comp_until ?? null, comp_note: sub.comp_note ?? null },
    new_data: { user_id: sub.user_id, comp_until: result.value, comp_note: newNote, preset },
    ip_address: null,
  });

  revalidateAdmin(sub.user_id);
  return { success: true, compUntil: result.value };
}

const grantPlanSchema = z.object({
  userId: z.string().uuid(),
  planId: z.string().uuid(),
  ...compFields,
});

export async function grantPlan(input: z.infer<typeof grantPlanSchema>) {
  const admin = await getAdminForAction();
  if ("error" in admin) return { error: admin.error };
  const { supabase, userId: actorId } = admin;

  const parsed = grantPlanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { userId, planId, preset, date, note } = parsed.data;

  const { data: target } = await supabase.from("profiles").select("id, role, email").eq("id", userId).single();
  if (!target) return { error: "User not found" };
  if (target.role !== "owner") return { error: "Plans can only be granted to owners" };

  const { data: existing } = await supabase
    .from("user_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1);
  if (existing && existing.length > 0) {
    return { error: "This owner already has an active subscription. Extend it instead." };
  }

  const { data: plan } = await supabase.from("subscription_plans").select("id, name").eq("id", planId).single();
  if (!plan) return { error: "Plan not found" };

  const comp = computeCompUntil(preset, null, todayUTC(), date);
  if ("error" in comp) return { error: comp.error };

  const nowIso = new Date().toISOString();
  const { data: created, error } = await supabase
    .from("user_subscriptions")
    .insert({
      user_id: userId,
      plan_id: planId,
      status: "active",
      stripe_customer_id: null,
      stripe_subscription_id: null,
      current_period_start: nowIso,
      current_period_end: null,
      comp_until: comp.value,
      comp_note: note || null,
    })
    .select("id")
    .single();
  if (error || !created) return { error: error?.message ?? "Could not create subscription" };

  await supabase.from("audit_log").insert({
    user_id: actorId,
    action: "grant_plan",
    table_name: "user_subscriptions",
    record_id: created.id,
    old_data: null,
    new_data: {
      user_id: userId,
      email: target.email,
      plan: plan.name,
      comp_until: comp.value,
      comp_note: note || null,
    },
    ip_address: null,
  });

  revalidateAdmin(userId);
  return { success: true };
}

// ------------------------------------------------------------
// Audit log
// ------------------------------------------------------------

export interface AuditLogFilters {
  action?: string;
  actorId?: string;
  tableName?: string;
  page?: number;
  pageSize?: number;
}

export async function getAuditLog(filters?: AuditLogFilters) {
  const admin = await getAdminForAction();
  if ("error" in admin) return { data: [], total: 0, error: admin.error };
  const { supabase } = admin;

  const page = Math.max(1, filters?.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters?.pageSize || 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters?.action) query = query.eq("action", filters.action);
  if (filters?.tableName) query = query.eq("table_name", filters.tableName);
  if (filters?.actorId && z.string().uuid().safeParse(filters.actorId).success) {
    query = query.eq("user_id", filters.actorId);
  }

  const { data, count, error } = await query;
  if (error) return { data: [], total: 0, error: error.message };

  return { data: data || [], total: count || 0, error: null };
}
