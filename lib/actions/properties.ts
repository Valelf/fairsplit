"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { revalidatePropertyPages } from "@/lib/server/revalidate";

const createPropertySchema = z.object({
  name: z.string().min(1, "Property name is required"),
  address_line1: z.string().min(1, "Address is required"),
  address_line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip_code: z.string().min(1, "ZIP code is required"),
  country: z.string().default("US"),
  timezone: z.string().default("America/Chicago"),
  transparency_level: z.enum(["full", "own_share"]).default("full"),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

export async function createProperty(input: CreatePropertyInput) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = createPropertySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data, error } = await supabase
    .from("properties")
    .insert({
      owner_id: user.id,
      ...parsed.data,
      address_line2: parsed.data.address_line2 ?? null,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/owner/properties");
  revalidatePath("/dashboard/owner/dashboard");

  return { data };
}

const updatePropertySchema = z.object({
  name: z.string().trim().min(1, "Property name is required").max(120),
  address_line1: z.string().trim().min(1, "Address is required").max(200),
  address_line2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(1, "State is required").max(50),
  zip_code: z.string().trim().min(1, "ZIP code is required").max(20),
  transparency_level: z.enum(["full", "own_share"]).optional(),
});

export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;

export async function updateProperty(propertyId: string, input: UpdatePropertyInput) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const id = z.string().uuid().safeParse(propertyId);
  const parsed = updatePropertySchema.safeParse(input);
  if (!id.success) return { error: "Invalid property" };
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data, error } = await supabase
    .from("properties")
    .update({
      ...parsed.data,
      address_line2: parsed.data.address_line2 || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePropertyPages(id.data);

  return { data };
}

/** Soft delete. The UI asks the owner to type the property name to confirm. */
export async function deleteProperty(propertyId: string, confirmName: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const id = z.string().uuid().safeParse(propertyId);
  if (!id.success) return { error: "Invalid property" };

  const { data: property } = await supabase
    .from("properties")
    .select("id, name")
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!property) return { error: "Property not found or access denied" };
  if (confirmName.trim() !== property.name.trim()) {
    return { error: "Type the property name exactly to confirm" };
  }

  // RPC: a plain UPDATE is rejected by RLS (deleted rows fail the SELECT policy).
  const { error } = await supabase.rpc("soft_delete_property", { p_property_id: id.data });

  if (error) {
    return { error: error.message };
  }

  revalidatePropertyPages(id.data);

  return { success: true };
}
