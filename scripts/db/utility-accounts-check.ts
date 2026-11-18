/**
 * Live RLS check for utility_accounts: the owner can create/update/archive, a tenant of the
 * property can read but not write, anon sees nothing, the full account number is never stored.
 * Creates throwaway rows and deletes them afterwards.
 * Usage: npx tsx scripts/db/utility-accounts-check.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const pw = process.env.SEED_DEMO_PASSWORD!;
let failures = 0;
const check = (n: string, ok: boolean, d = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? `  (${d})` : ""}`);
  if (!ok) failures++;
};

async function signIn(email: string) {
  const c = createClient(url, anon, { auth: { persistSession: false } });
  const r = await c.auth.signInWithPassword({ email, password: pw });
  if (r.error) throw new Error(`sign-in failed for ${email}: ${r.error.message}`);
  return c;
}

(async () => {
  const { data: owner } = await service.from("profiles").select("id").eq("email", "shekar@example.com").single();
  const { data: property } = await service
    .from("properties")
    .select("id, name")
    .eq("owner_id", owner!.id)
    .ilike("name", "%575 McKinney%")
    .is("deleted_at", null)
    .single();
  const propertyId = property!.id as string;
  const { data: tenantRow } = await service
    .from("property_tenants")
    .select("email")
    .eq("property_id", propertyId)
    .eq("status", "active")
    .not("tenant_id", "is", null)
    .limit(1)
    .maybeSingle();

  const createdIds: string[] = [];
  try {
    const o = await signIn("shekar@example.com");
    const ins = await o
      .from("utility_accounts")
      .insert({ property_id: propertyId, category: "trash", provider: "RLS probe trash", account_number_last4: "9012", typical_amount_cents: 2500, billing_day: 5 })
      .select()
      .single();
    check("owner can create account", !ins.error, ins.error?.message);
    if (ins.data) createdIds.push(ins.data.id);

    const tooLong = await o
      .from("utility_accounts")
      .insert({ property_id: propertyId, category: "gas", provider: "RLS probe gas", account_number_last4: "123456789" })
      .select();
    check("full account number rejected by CHECK", !!tooLong.error, tooLong.error?.message);
    for (const r of tooLong.data ?? []) createdIds.push(r.id);

    const upd = await o.from("utility_accounts").update({ active: false }).eq("id", ins.data!.id).select().single();
    check("owner can archive", !upd.error && upd.data?.active === false, upd.error?.message);

    const bad = await o.from("bills").select("id").eq("category", "trash").limit(1);
    check("bills accept trash category query", !bad.error, bad.error?.message);

    if (tenantRow?.email) {
      const t = await signIn(tenantRow.email);
      const read = await t.from("utility_accounts").select("id").eq("property_id", propertyId);
      check("tenant can read property accounts", !read.error && (read.data?.length ?? 0) > 0, `${read.data?.length} rows`);
      const tIns = await t.from("utility_accounts").insert({ property_id: propertyId, category: "gas", provider: "tenant probe" }).select();
      check("tenant cannot insert", !!tIns.error || (tIns.data?.length ?? 0) === 0, tIns.error?.message);
      for (const r of tIns.data ?? []) createdIds.push(r.id);
      const tUpd = await t.from("utility_accounts").update({ provider: "hacked" }).eq("id", ins.data!.id).select();
      check("tenant cannot update", (tUpd.data?.length ?? 0) === 0, tUpd.error?.message);
    } else {
      console.log("SKIP  no claimed active tenant found for tenant checks");
    }

    const a = createClient(url, anon, { auth: { persistSession: false } });
    const aRead = await a.from("utility_accounts").select("id");
    check("anon sees nothing", (aRead.data?.length ?? 0) === 0, aRead.error?.message);
  } finally {
    if (createdIds.length) await service.from("utility_accounts").delete().in("id", createdIds);
    const { data: left } = await service.from("utility_accounts").select("id").ilike("provider", "%probe%");
    check("cleanup: probe rows removed", (left?.length ?? 0) === 0);
  }
  console.log(failures ? `${failures} FAILED` : "ALL PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
