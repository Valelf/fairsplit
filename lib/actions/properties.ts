"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

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

export async function updateProperty(
  propertyId: string,
  input: Partial<CreatePropertyInput>
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("properties")
    .update(input)
    .eq("id", propertyId)
    .eq("owner_id", user.id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/owner/properties");
  revalidatePath(`/dashboard/owner/properties/${propertyId}`);

  return { data };
}

export async function deleteProperty(propertyId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Soft delete
  const { error } = await supabase
    .from("properties")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", propertyId)
    .eq("owner_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/owner/properties");
  revalidatePath("/dashboard/owner/dashboard");

  return { success: true };
}
