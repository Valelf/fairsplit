"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { createNotification } from "@/lib/actions/notifications";

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

  revalidatePath(`/dashboard/owner/properties/${parsed.data.property_id}`);

  return { data };
}

export async function markTenantDeparted(
  tenantRecordId: string,
  leaveDate: string
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("property_tenants")
    .update({
      status: "departed",
      leave_date: leaveDate,
    })
    .eq("id", tenantRecordId)
    .select("property_id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/owner/properties/${data.property_id}`);

  return { success: true };
}
