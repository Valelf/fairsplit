"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import type { UserRole } from "@/lib/supabase/types";

const changeRoleSchema = z.object({
  userId: z.string().uuid(),
  newRole: z.enum(["admin", "owner", "tenant"]),
});

export async function changeUserRole(
  input: z.infer<typeof changeRoleSchema>
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Admin access required" };
  }

  const parsed = changeRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Get old role for audit log
  const { data: targetUser } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", parsed.data.userId)
    .single();

  if (!targetUser) {
    return { error: "User not found" };
  }

  const oldRole = targetUser.role;

  // Use admin client to bypass RLS for profile update
  const adminClient = createAdminClient();

  const { error: updateError } = await adminClient
    .from("profiles")
    .update({ role: parsed.data.newRole })
    .eq("id", parsed.data.userId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Write audit log
  await adminClient.from("audit_log").insert({
    user_id: user.id,
    action: "change_role",
    table_name: "profiles",
    record_id: parsed.data.userId,
    old_data: { role: oldRole, email: targetUser.email },
    new_data: { role: parsed.data.newRole },
    ip_address: null,
  });

  revalidatePath("/dashboard/admin");

  return { success: true };
}

export interface AuditLogFilters {
  action?: string;
  tableName?: string;
  page?: number;
  pageSize?: number;
}

export async function getAuditLog(filters?: AuditLogFilters) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], total: 0, error: "Not authenticated" };
  }

  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters?.action) {
    query = query.eq("action", filters.action);
  }

  if (filters?.tableName) {
    query = query.eq("table_name", filters.tableName);
  }

  const { data, count, error } = await query;

  if (error) {
    return { data: [], total: 0, error: error.message };
  }

  return { data: data || [], total: count || 0, error: null };
}
