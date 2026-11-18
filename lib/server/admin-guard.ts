import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * For admin pages: returns the RLS-scoped client and the admin's user id,
 * or redirects. RLS (public.is_admin()) remains the real gate on every query.
 */
export async function requireAdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/login");

  return { supabase, userId: user.id };
}

/** For admin server actions: same check, but returns an error instead of redirecting. */
export async function getAdminForAction() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const };

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || isAdmin !== true) return { error: "Admin access required" as const };

  return { supabase, userId: user.id };
}
