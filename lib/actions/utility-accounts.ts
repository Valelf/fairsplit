"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePropertyPages } from "@/lib/server/revalidate";
import { BILL_CATEGORY_VALUES } from "@/lib/utilities/categories";
import { toLast4 } from "@/lib/utilities/suggest";

const accountFieldsSchema = z.object({
  category: z.enum(BILL_CATEGORY_VALUES),
  provider: z.string().trim().min(1, "Provider name is required").max(120),
  // Accepts whatever the owner types; only the last 4 alphanumerics are ever stored.
  account_number: z.string().max(64).optional().nullable(),
  typical_amount_cents: z
    .number()
    .int()
    .positive("Typical amount must be positive")
    .max(100_000_000)
    .optional()
    .nullable(),
  billing_day: z.number().int().min(1).max(31).optional().nullable(),
});

export type UtilityAccountInput = z.input<typeof accountFieldsSchema>;

const idSchema = z.string().uuid();

async function requireOwner(propertyId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const id = idSchema.safeParse(propertyId);
  if (!id.success) return { ok: false as const, error: "Invalid property" };

  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!property) return { ok: false as const, error: "Property not found or access denied" };
  return { ok: true as const, supabase, propertyId: property.id };
}

async function loadOwnedAccount(accountId: string) {
  const id = idSchema.safeParse(accountId);
  if (!id.success) return { ok: false as const, error: "Invalid utility account" };
  const supabase = createClient();
  const { data: account } = await supabase
    .from("utility_accounts")
    .select("id, property_id")
    .eq("id", id.data)
    .is("deleted_at", null)
    .maybeSingle();
  if (!account) return { ok: false as const, error: "Utility account not found" };
  const owner = await requireOwner(account.property_id);
  if (!owner.ok) return owner;
  return { ok: true as const, supabase: owner.supabase, account };
}

function toRow(v: z.output<typeof accountFieldsSchema>) {
  return {
    category: v.category,
    provider: v.provider,
    account_number_last4: toLast4(v.account_number),
    typical_amount_cents: v.typical_amount_cents ?? null,
    billing_day: v.billing_day ?? null,
  };
}

export async function createUtilityAccount(propertyId: string, input: UtilityAccountInput) {
  const owner = await requireOwner(propertyId);
  if (!owner.ok) return { error: owner.error };

  const parsed = accountFieldsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data, error } = await owner.supabase
    .from("utility_accounts")
    .insert({ property_id: owner.propertyId, ...toRow(parsed.data) })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePropertyPages(owner.propertyId);
  return { data };
}

/**
 * Update an account. When `account_number` is omitted (undefined) the stored last 4 is kept;
 * an empty string clears it.
 */
export async function updateUtilityAccount(accountId: string, input: UtilityAccountInput) {
  const loaded = await loadOwnedAccount(accountId);
  if (!loaded.ok) return { error: loaded.error };

  const parsed = accountFieldsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const row = toRow(parsed.data);
  const update: Partial<typeof row> & { updated_at: string } = {
    ...row,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.account_number === undefined) delete update.account_number_last4;

  const { error } = await loaded.supabase
    .from("utility_accounts")
    .update(update)
    .eq("id", loaded.account.id);
  if (error) return { error: error.message };

  revalidatePropertyPages(loaded.account.property_id);
  return { success: true };
}

/** Archive (active = false) or restore an account. Archived accounts are hidden from pre-fill. */
export async function setUtilityAccountActive(accountId: string, active: boolean) {
  const loaded = await loadOwnedAccount(accountId);
  if (!loaded.ok) return { error: loaded.error };

  const { error } = await loaded.supabase
    .from("utility_accounts")
    .update({ active: Boolean(active), updated_at: new Date().toISOString() })
    .eq("id", loaded.account.id);
  if (error) return { error: error.message };

  revalidatePropertyPages(loaded.account.property_id);
  return { success: true };
}
