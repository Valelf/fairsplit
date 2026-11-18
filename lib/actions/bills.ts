"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { createNotification } from "@/lib/server/notifications";
import { calculateAndStoreSplits } from "@/lib/server/splits";

const createBillSchema = z.object({
  cycle_id: z.string().uuid(),
  property_id: z.string().uuid(),
  category: z.enum(["internet", "electricity", "water", "other"]),
  provider: z.string().min(1, "Provider name is required"),
  amount_cents: z.number().int().positive("Amount must be positive"),
  service_start: z.string().min(1, "Service start date is required"),
  service_end: z.string().min(1, "Service end date is required"),
  source: z.enum(["manual", "pdf_parsed"]).default("manual"),
  pdf_storage_path: z.string().optional(),
  notes: z.string().optional(),
});

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
    .single();

  if (!property) {
    return { error: "Property not found or access denied" };
  }

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

  revalidatePath(`/dashboard/owner/properties/${parsed.data.property_id}`);

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

  // Get property_id and pdf path before delete
  const { data: bill } = await supabase
    .from("bills")
    .select("property_id, pdf_storage_path")
    .eq("id", billId)
    .single();

  if (!bill) {
    return { error: "Bill not found" };
  }

  // Delete PDF from storage if exists
  if (bill.pdf_storage_path) {
    await supabase.storage
      .from("bill-pdfs")
      .remove([bill.pdf_storage_path]);
  }

  // bill_splits cascade deleted
  const { error } = await supabase.from("bills").delete().eq("id", billId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/owner/properties/${bill.property_id}`);

  return { success: true };
}
