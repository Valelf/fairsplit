"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { createNotification } from "@/lib/server/notifications";
import { calculateAndStoreSplits, recalculateBillSplits } from "@/lib/server/splits";
import { revalidatePropertyPages } from "@/lib/server/revalidate";

const createBillSchema = z
  .object({
    cycle_id: z.string().uuid(),
    property_id: z.string().uuid(),
    category: z.enum(["internet", "electricity", "water", "other"]),
    provider: z.string().trim().min(1, "Provider name is required").max(120),
    amount_cents: z.number().int().positive("Amount must be positive").max(100_000_000),
    service_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid start date"),
    service_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid end date"),
    source: z.enum(["manual", "pdf_parsed"]).default("manual"),
    pdf_storage_path: z.string().max(300).optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine((v) => v.service_start <= v.service_end, {
    message: "Service end can't be before service start",
  })
  // Uploads are stored as "<property_id>/<file>" (see /api/bills/upload-pdf).
  .refine(
    (v) =>
      !v.pdf_storage_path ||
      (v.pdf_storage_path.startsWith(`${v.property_id}/`) && !v.pdf_storage_path.includes("..")),
    { message: "Invalid PDF reference" }
  );

export type CreateBillInput = z.infer<typeof createBillSchema>;

export async function createBill(input: CreateBillInput) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = createBillSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Verify ownership
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", parsed.data.property_id)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!property) {
    return { error: "Property not found or access denied" };
  }

  // The cycle must belong to this property and still be editable.
  const { data: targetCycle } = await supabase
    .from("billing_cycles")
    .select("id, status")
    .eq("id", parsed.data.cycle_id)
    .eq("property_id", parsed.data.property_id)
    .maybeSingle();
  if (!targetCycle) return { error: "Billing cycle not found" };
  if (targetCycle.status === "closed") return { error: "Reopen the cycle before adding bills" };

  // Create the bill
  const { data: bill, error: billError } = await supabase
    .from("bills")
    .insert({
      cycle_id: parsed.data.cycle_id,
      property_id: parsed.data.property_id,
      category: parsed.data.category,
      provider: parsed.data.provider,
      amount_cents: parsed.data.amount_cents,
      service_start: parsed.data.service_start,
      service_end: parsed.data.service_end,
      source: parsed.data.source,
      notes: parsed.data.notes || null,
      pdf_storage_path: parsed.data.pdf_storage_path || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (billError) {
    return { error: billError.message };
  }

  // Calculate and store splits
  const splitError = await calculateAndStoreSplits(bill.id);

  if (splitError) {
    return { error: splitError };
  }

  // Notify all property tenants about the new bill
  const { data: propertyTenants } = await supabase
    .from("property_tenants")
    .select("tenant_id")
    .eq("property_id", parsed.data.property_id)
    .in("status", ["active"])
    .not("tenant_id", "is", null);

  if (propertyTenants) {
    const { data: cycle } = await supabase
      .from("billing_cycles")
      .select("label")
      .eq("id", parsed.data.cycle_id)
      .single();

    for (const tenant of propertyTenants) {
      if (tenant.tenant_id) {
        await createNotification(
          tenant.tenant_id,
          "new_bill",
          `New ${parsed.data.category} bill added`,
          `A ${parsed.data.category} bill for $${(parsed.data.amount_cents / 100).toFixed(2)} from ${parsed.data.provider} has been added.`,
          {
            billId: bill.id,
            propertyId: parsed.data.property_id,
            cycleId: parsed.data.cycle_id,
            cycleName: cycle?.label,
          }
        );
      }
    }
  }

  revalidatePropertyPages(parsed.data.property_id);

  return { data: bill };
}

export async function deleteBill(billId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const loaded = await loadOwnedBill(billId);
  if (!loaded.ok) return { error: loaded.error };
  const { bill } = loaded;
  if (loaded.cycleClosed) return { ok: false as const, error: "Reopen the cycle before deleting its bills" };

  // bill_splits and bill_flags cascade on delete
  const { error } = await supabase.from("bills").delete().eq("id", bill.id);

  if (error) {
    return { error: error.message };
  }

  // Remove the PDF only once the bill row is gone
  if (bill.pdf_storage_path) {
    await supabase.storage.from("bill-pdfs").remove([bill.pdf_storage_path]);
  }

  revalidatePropertyPages(bill.property_id);

  return { success: true };
}

/** Load a bill, confirm the signed-in user owns its property, and report whether its cycle is closed. */
async function loadOwnedBill(billId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const id = z.string().uuid().safeParse(billId);
  if (!id.success) return { ok: false as const, error: "Invalid bill" };

  const { data: bill } = await supabase.from("bills").select("*").eq("id", id.data).single();
  if (!bill) return { ok: false as const, error: "Bill not found" };

  const [{ data: property }, { data: cycle }] = await Promise.all([
    supabase
      .from("properties")
      .select("id")
      .eq("id", bill.property_id)
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .single(),
    supabase.from("billing_cycles").select("status").eq("id", bill.cycle_id).single(),
  ]);
  if (!property) return { ok: false as const, error: "Property not found or access denied" };

  return { ok: true as const, supabase, bill, cycleClosed: cycle?.status === "closed" };
}

const updateBillSchema = z
  .object({
    category: z.enum(["internet", "electricity", "water", "other"]),
    provider: z.string().trim().min(1, "Provider name is required").max(120),
    amount_cents: z.number().int().positive("Amount must be positive").max(100_000_000),
    service_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid start date"),
    service_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid end date"),
    notes: z.string().max(1000).optional().nullable(),
  })
  .refine((v) => v.service_start <= v.service_end, {
    message: "Service end can't be before service start",
  });

export type UpdateBillInput = z.infer<typeof updateBillSchema>;

/** Edit a bill's amount, dates, provider or category, then re-split it atomically. */
export async function updateBill(billId: string, input: UpdateBillInput) {
  const loaded = await loadOwnedBill(billId);
  if (!loaded.ok) return { error: loaded.error };
  const { supabase, bill } = loaded;
  if (loaded.cycleClosed) return { ok: false as const, error: "Reopen the cycle before editing its bills" };

  const parsed = updateBillSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("bills")
    .update({
      ...parsed.data,
      notes: parsed.data.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bill.id);
  if (error) return { error: error.message };

  const splitError = await recalculateBillSplits(bill.id);
  if (splitError) return { error: `Bill saved, but re-splitting failed: ${splitError}` };

  revalidatePropertyPages(bill.property_id);
  return { success: true };
}
