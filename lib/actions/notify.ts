"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendCycleReadyEmails } from "@/lib/server/cycle-emails";

const publishSchema = z.object({
  cycleId: z.string().uuid(),
  propertyId: z.string().uuid(),
});

export type PublishCycleResult =
  | { success: true; recipients: number; sent: number; skipped: number; failed: number; alreadySent: number }
  | { error: string };

/**
 * Owner: publish a cycle to tenants. Opens a draft cycle and emails every active tenant their
 * share. Re-running only emails tenants who haven't had it yet (e.g. a newly joined tenant).
 */
export async function publishCycleToTenants(
  input: z.infer<typeof publishSchema>
): Promise<PublishCycleResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = publishSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { cycleId, propertyId } = parsed.data;

  // Ownership check through RLS + explicit owner match.
  const { data: cycle } = await supabase
    .from("billing_cycles")
    .select("id, status, published_at, properties!inner(owner_id)")
    .eq("id", cycleId)
    .eq("property_id", propertyId)
    .maybeSingle();
  const ownerId = (cycle?.properties as unknown as { owner_id: string } | null)?.owner_id;
  if (!cycle || ownerId !== user.id) return { error: "Cycle not found or access denied" };

  const { count } = await supabase
    .from("bills")
    .select("id", { count: "exact", head: true })
    .eq("cycle_id", cycleId);
  if (!count) return { error: "Add at least one bill before sending this cycle to tenants" };

  if (cycle.status === "draft" || !cycle.published_at) {
    const { error } = await supabase
      .from("billing_cycles")
      .update({
        ...(cycle.status === "draft" ? { status: "open" as const } : {}),
        published_at: cycle.published_at ?? new Date().toISOString(),
      })
      .eq("id", cycleId);
    if (error) return { error: error.message };
  }

  let summary;
  try {
    summary = await sendCycleReadyEmails(cycleId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not send emails" };
  }

  revalidatePath(`/dashboard/owner/properties/${propertyId}/cycles/${cycleId}`);
  revalidatePath(`/dashboard/owner/properties/${propertyId}`);
  return { success: true, ...summary };
}

const prefsSchema = z.object({ emailReminders: z.boolean() });

/** Any signed-in user: turn reminder / digest emails on or off. */
export async function setEmailReminders(
  input: z.infer<typeof prefsSchema>
): Promise<{ success: true } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data, error } = await supabase
    .from("profiles")
    .update({ email_reminders: parsed.data.emailReminders })
    .eq("id", user.id)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Profile not found" };

  revalidatePath("/dashboard/tenant/settings");
  revalidatePath("/dashboard/owner/settings");
  return { success: true };
}
