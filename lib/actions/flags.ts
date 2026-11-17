"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/actions/notifications";
import { notifyUser } from "@/lib/notifications/notify";
import { calculateAndStoreSplits } from "@/lib/actions/bills";
import { flagSubmittedEmail } from "@/lib/email/templates/flag-submitted";
import { flagResolvedEmail } from "@/lib/email/templates/flag-resolved";
import { z } from "zod";

const submitFlagSchema = z.object({
  billId: z.string().uuid(),
  reason: z.string().min(1, "Reason is required"),
  suggestedAmountCents: z.number().int().positive().optional(),
});

export async function submitFlag(input: z.infer<typeof submitFlagSchema>) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = submitFlagSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Get the bill to find property_id
  const { data: bill } = await supabase
    .from("bills")
    .select("id, property_id, category, provider")
    .eq("id", parsed.data.billId)
    .single();

  if (!bill) {
    return { error: "Bill not found" };
  }

  // Get the tenant record for this user and property
  const { data: tenantRecord } = await supabase
    .from("property_tenants")
    .select("id")
    .eq("property_id", bill.property_id)
    .eq("tenant_id", user.id)
    .in("status", ["active"])
    .single();

  if (!tenantRecord) {
    return { error: "You are not an active tenant of this property" };
  }

  // Create the flag
  const { data: flag, error: flagError } = await supabase
    .from("bill_flags")
    .insert({
      bill_id: parsed.data.billId,
      property_id: bill.property_id,
      tenant_id: tenantRecord.id,
      flagged_by: user.id,
      reason: parsed.data.reason,
      suggested_amount_cents: parsed.data.suggestedAmountCents || null,
      status: "open",
      resolution_note: null,
      resolved_by: null,
      resolved_at: null,
      resolved_amount_cents: null,
    })
    .select()
    .single();

  if (flagError) {
    if (flagError.code === "23505") {
      return { error: "You already have an open flag on this bill" };
    }
    return { error: flagError.message };
  }

  // Notify the property owner
  const { data: property } = await supabase
    .from("properties")
    .select("owner_id, name")
    .eq("id", bill.property_id)
    .single();

  if (property) {
    // Get owner profile for email
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", property.owner_id)
      .single();

    // Get tenant profile for email
    const { data: tenantProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const emailTemplate = flagSubmittedEmail({
      ownerName: ownerProfile?.full_name || "Property Owner",
      tenantName: tenantProfile?.full_name || "Tenant",
      category: bill.category,
      provider: bill.provider,
      reason: parsed.data.reason,
      propertyName: property.name,
      flagsUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/dashboard/owner/properties/${bill.property_id}/flags`,
    });

    await notifyUser({
      userId: property.owner_id,
      type: "flag_submitted",
      title: `Bill flagged: ${bill.category} - ${bill.provider}`,
      body: parsed.data.reason,
      metadata: {
        flagId: flag.id,
        billId: bill.id,
        propertyId: bill.property_id,
        propertyName: property.name,
      },
      email: emailTemplate,
    });
  }

  revalidatePath(`/dashboard`);

  return { data: flag };
}

export async function markFlagUnderReview(flagId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: flag, error } = await supabase
    .from("bill_flags")
    .update({ status: "under_review" })
    .eq("id", flagId)
    .select("*, bills(category, provider)")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Notify the tenant who flagged
  await createNotification(
    flag.flagged_by,
    "flag_under_review",
    "Your flag is being reviewed",
    `Your flag on the ${(flag as any).bills?.category} bill is now under review.`,
    { flagId: flag.id, propertyId: flag.property_id }
  );

  revalidatePath(`/dashboard`);

  return { data: flag };
}

const resolveFlagSchema = z.object({
  flagId: z.string().uuid(),
  resolvedAmountCents: z.number().int().positive("Resolved amount must be positive"),
  resolutionNote: z.string().min(1, "Resolution note is required"),
});

export async function resolveFlag(input: z.infer<typeof resolveFlagSchema>) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = resolveFlagSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Get the flag with bill info
  const { data: flag } = await supabase
    .from("bill_flags")
    .select("*, bills(id, property_id, amount_cents, service_start, service_end, category, provider)")
    .eq("id", parsed.data.flagId)
    .single();

  if (!flag) {
    return { error: "Flag not found" };
  }

  const bill = (flag as any).bills;

  // Update the flag
  const { error: flagError } = await supabase
    .from("bill_flags")
    .update({
      status: "resolved",
      resolved_amount_cents: parsed.data.resolvedAmountCents,
      resolution_note: parsed.data.resolutionNote,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.flagId);

  if (flagError) {
    return { error: flagError.message };
  }

  // Update the bill amount
  const { error: billError } = await supabase
    .from("bills")
    .update({ amount_cents: parsed.data.resolvedAmountCents })
    .eq("id", flag.bill_id);

  if (billError) {
    return { error: billError.message };
  }

  // Delete old splits and recalculate
  await supabase
    .from("bill_splits")
    .delete()
    .eq("bill_id", flag.bill_id);

  const splitError = await calculateAndStoreSplits(
    flag.bill_id,
    bill.property_id,
    parsed.data.resolvedAmountCents,
    bill.service_start,
    bill.service_end
  );

  if (splitError) {
    return { error: splitError };
  }

  // Get property name for email
  const { data: property } = await supabase
    .from("properties")
    .select("name")
    .eq("id", flag.property_id)
    .single();

  // Get tenant name for email
  const { data: tenantProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", flag.flagged_by)
    .single();

  const resolvedEmailTemplate = flagResolvedEmail({
    tenantName: tenantProfile?.full_name || "Tenant",
    category: bill.category,
    provider: bill.provider,
    resolutionNote: parsed.data.resolutionNote,
    resolved: true,
    propertyName: property?.name || "Property",
    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/dashboard/tenant/properties/${flag.property_id}/bills`,
  });

  // Notify the flagging tenant
  await notifyUser({
    userId: flag.flagged_by,
    type: "flag_resolved",
    title: `Flag resolved: ${bill.category} - ${bill.provider}`,
    body: parsed.data.resolutionNote,
    metadata: {
      flagId: flag.id,
      billId: flag.bill_id,
      propertyId: flag.property_id,
    },
    email: resolvedEmailTemplate,
  });

  // Notify all tenants of the property about the bill adjustment
  const { data: tenants } = await supabase
    .from("property_tenants")
    .select("tenant_id")
    .eq("property_id", flag.property_id)
    .in("status", ["active"])
    .not("tenant_id", "is", null);

  if (tenants) {
    for (const tenant of tenants) {
      if (tenant.tenant_id && tenant.tenant_id !== flag.flagged_by) {
        await createNotification(
          tenant.tenant_id,
          "bill_adjusted",
          `Bill adjusted: ${bill.category} - ${bill.provider}`,
          "A bill has been adjusted after a flag review. Your split may have changed.",
          { billId: flag.bill_id, propertyId: flag.property_id }
        );
      }
    }
  }

  revalidatePath(`/dashboard`);

  return { success: true };
}

const dismissFlagSchema = z.object({
  flagId: z.string().uuid(),
  resolutionNote: z.string().min(1, "Resolution note is required"),
});

export async function dismissFlag(input: z.infer<typeof dismissFlagSchema>) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = dismissFlagSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data: flag, error } = await supabase
    .from("bill_flags")
    .update({
      status: "dismissed",
      resolution_note: parsed.data.resolutionNote,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.flagId)
    .select("*, bills(category, provider)")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Notify the flagging tenant
  await createNotification(
    flag.flagged_by,
    "flag_dismissed",
    `Flag dismissed: ${(flag as any).bills?.category} - ${(flag as any).bills?.provider}`,
    parsed.data.resolutionNote,
    { flagId: flag.id, propertyId: flag.property_id }
  );

  revalidatePath(`/dashboard`);

  return { data: flag };
}

export async function getPropertyFlags(propertyId: string, statusFilter?: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: "Not authenticated" };
  }

  let query = supabase
    .from("bill_flags")
    .select("*, bills(category, provider, amount_cents), property_tenants(display_name, email)")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter as any);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
}
