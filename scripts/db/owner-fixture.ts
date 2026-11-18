/**
 * Temporary fixture for manual/automated UI testing of owner management.
 *   npx tsx scripts/db/owner-fixture.ts setup     → prints {"propertyId","cycleId"} (owner: seeded owner)
 *   npx tsx scripts/db/owner-fixture.ts teardown  → deletes every "ZZ UI test" property and its data
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const svc = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const NAME = "ZZ UI test (temp)";

(async () => {
  if (process.argv[2] === "teardown") {
    const { data: props } = await svc.from("properties").select("id").eq("name", NAME);
    for (const p of props ?? []) {
      await svc.from("bills").delete().eq("property_id", p.id);
      await svc.from("billing_cycles").delete().eq("property_id", p.id);
      await svc.from("property_tenants").delete().eq("property_id", p.id);
      await svc.from("properties").delete().eq("id", p.id);
    }
    console.log(`removed ${props?.length ?? 0} temp properties`);
    return;
  }
  const owner = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  await owner.auth.signInWithPassword({ email: "shekar@example.com", password: process.env.SEED_DEMO_PASSWORD! });
  const ownerId = (await owner.auth.getUser()).data.user!.id;
  const { data: prop, error } = await owner
    .from("properties")
    .insert({ owner_id: ownerId, name: NAME, address_line1: "TBD", city: "Frisco", state: "TX", zip_code: "00000" })
    .select()
    .single();
  if (error) throw error;
  await owner.from("property_tenants").insert([
    { property_id: prop.id, email: "ui-a@example.invalid", display_name: "Alpha", join_date: "2026-01-01", status: "invited" },
    { property_id: prop.id, email: "ui-b@example.invalid", display_name: "Bravo", join_date: "2026-01-01", status: "invited" },
  ]);
  const { data: cycle } = await owner
    .from("billing_cycles")
    .insert({ property_id: prop.id, label: "Jan 2026", status: "open", created_by: ownerId, start_date: "2026-01-01", end_date: "2026-01-31" })
    .select()
    .single();
  const { data: bill } = await owner
    .from("bills")
    .insert({ cycle_id: cycle!.id, property_id: prop.id, category: "electricity", provider: "UI Power", amount_cents: 10000, service_start: "2026-01-01", service_end: "2026-01-31", created_by: ownerId })
    .select()
    .single();
  await owner.rpc("recalculate_bill_splits", { p_bill_id: bill!.id });
  console.log(JSON.stringify({ propertyId: prop.id, cycleId: cycle!.id, billId: bill!.id }));
})().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
