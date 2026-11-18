"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeCashtag, normalizePaypalMe, normalizeVenmoHandle } from "@/lib/payments";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .transform((v) => (v ? v : null));

const paymentMethodsSchema = z.object({
  payee_name: optional(100),
  venmo_handle: optional(50)
    .transform((v) => (v ? normalizeVenmoHandle(v) || null : null))
    .refine((v) => v === null || /^[A-Za-z0-9_-]{1,30}$/.test(v), "Venmo username can only use letters, numbers, - and _"),
  cashapp_handle: optional(50)
    .transform((v) => (v ? normalizeCashtag(v) || null : null))
    .refine((v) => v === null || /^[A-Za-z0-9_]{1,20}$/.test(v), "Cashtag can only use letters, numbers and _"),
  zelle_contact: optional(100).refine(
    (v) =>
      v === null ||
      z.string().email().safeParse(v).success ||
      /^\+?[\d\s().-]{7,20}$/.test(v),
    "Zelle needs an email address or phone number"
  ),
  paypal_me: optional(50)
    .transform((v) => (v ? normalizePaypalMe(v) || null : null))
    .refine((v) => v === null || /^[A-Za-z0-9]{1,20}$/.test(v), "PayPal.me name can only use letters and numbers"),
  instructions: optional(500),
});

export type PaymentMethodsInput = z.input<typeof paymentMethodsSchema>;

export async function savePaymentMethods(input: PaymentMethodsInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = paymentMethodsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("owner_payment_methods")
    .upsert({ owner_id: user.id, ...parsed.data }, { onConflict: "owner_id" });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/owner/settings");
  // Tenants see these handles on every cycle page.
  revalidatePath("/dashboard/tenant", "layout");
  return { success: true as const, data: parsed.data };
}
