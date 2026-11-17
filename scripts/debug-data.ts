import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log("=== DATA DIAGNOSTIC ===\n");

  // 1. Check profiles
  const { data: profiles, error: profileErr } = await supabase
    .from("profiles")
    .select("id, email, role, full_name");

  console.log("PROFILES:", profileErr ? `ERROR: ${profileErr.message}` : "");
  profiles?.forEach((p) => console.log(`  ${p.role.padEnd(8)} ${p.email.padEnd(30)} ${p.full_name} (${p.id})`));

  // 2. Check properties
  const { data: properties, error: propErr } = await supabase
    .from("properties")
    .select("id, name, owner_id, deleted_at");

  console.log("\nPROPERTIES:", propErr ? `ERROR: ${propErr.message}` : "");
  properties?.forEach((p) => console.log(`  ${p.name} owner=${p.owner_id} deleted=${p.deleted_at}`));

  // 3. Check if owner_id matches shekar's profile id
  const shekar = profiles?.find((p) => p.email === "shekar@example.com");
  const property = properties?.[0];
  if (shekar && property) {
    console.log(`\nOWNER MATCH: shekar.id=${shekar.id} property.owner_id=${property.owner_id}`);
    console.log(`  Match: ${shekar.id === property.owner_id}`);
  }

  // 4. Check property_tenants
  const { data: tenants, error: tenantErr } = await supabase
    .from("property_tenants")
    .select("id, display_name, tenant_id, status, property_id");

  console.log("\nPROPERTY_TENANTS:", tenantErr ? `ERROR: ${tenantErr.message}` : "");
  tenants?.forEach((t) => console.log(`  ${t.display_name.padEnd(10)} status=${t.status.padEnd(10)} tenant_id=${t.tenant_id}`));

  // 5. Check billing_cycles
  const { data: cycles, error: cycleErr } = await supabase
    .from("billing_cycles")
    .select("id, label, status, property_id, created_by");

  console.log("\nBILLING_CYCLES:", cycleErr ? `ERROR: ${cycleErr.message}` : "");
  cycles?.forEach((c) => console.log(`  ${c.label.padEnd(15)} status=${c.status} created_by=${c.created_by}`));

  // 6. Check bills
  const { data: bills, error: billErr } = await supabase
    .from("bills")
    .select("id, category, provider, amount_cents, cycle_id");

  console.log("\nBILLS:", billErr ? `ERROR: ${billErr.message}` : "");
  bills?.forEach((b) => console.log(`  ${b.provider.padEnd(20)} ${b.category.padEnd(12)} $${(b.amount_cents / 100).toFixed(2)}`));

  // 7. Check bill_splits
  const { data: splits, error: splitErr } = await supabase
    .from("bill_splits")
    .select("id, tenant_id, person_days, amount_cents");

  console.log("\nBILL_SPLITS:", splitErr ? `ERROR: ${splitErr.message}` : `${splits?.length} records`);
}

main().catch(console.error);
