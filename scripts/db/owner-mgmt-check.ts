/**
 * Live check of the owner-management recalculation RPCs, using a temporary property owned by the
 * seeded owner. Verifies: owner can recalc, other users/anon cannot, date changes re-split to the
 * same numbers as the TS algorithm, split rows are updated in place (same ids), 0-day rows are
 * removed. Deletes everything it created. Usage: npx tsx scripts/db/owner-mgmt-check.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
import { calculateBillSplitCents, sortTenantPeriods } from "../../lib/calculations/person-days";
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const svc = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const pw = process.env.SEED_DEMO_PASSWORD!;

let failures = 0;
function check(name: string, ok: boolean, extra = "") {
  if (!ok) failures++;
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${extra ? " " + extra : ""}`);
}

async function signIn(email: string) {
  const c = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: pw });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return c;
}

(async () => {
  const owner = await signIn("shekar@example.com");
  const ownerId = (await owner.auth.getUser()).data.user!.id;
  let propertyId: string | null = null;
  try {
    const { data: prop, error: pErr } = await owner
      .from("properties")
      .insert({ owner_id: ownerId, name: "ZZ recalc check (temp)", address_line1: "1 Test St", city: "Test", state: "TX", zip_code: "00000" })
      .select()
      .single();
    if (pErr) throw pErr;
    propertyId = prop.id;

    const mk = (n: string, join: string, leave: string | null) => ({
      property_id: prop.id, email: `recalc-${n}@example.invalid`, display_name: n, join_date: join, leave_date: leave, status: "invited",
    });
    const { data: tenants, error: tErr } = await owner
      .from("property_tenants")
      .insert([mk("a", "2026-01-01", null), mk("b", "2026-01-01", null), mk("c", "2026-01-20", null)])
      .select();
    if (tErr) throw tErr;
    const { data: cycle } = await owner
      .from("billing_cycles")
      .insert({ property_id: prop.id, label: "Jan 2026", status: "open", created_by: ownerId, start_date: "2026-01-01", end_date: "2026-01-31" })
      .select()
      .single();
    const { data: bill, error: bErr } = await owner
      .from("bills")
      .insert({ cycle_id: cycle!.id, property_id: prop.id, category: "electricity", provider: "Test", amount_cents: 10001, service_start: "2026-01-01", service_end: "2026-01-31", created_by: ownerId })
      .select()
      .single();
    if (bErr) throw bErr;

    const r1 = await owner.rpc("recalculate_bill_splits", { p_bill_id: bill.id });
    check("owner can recalc a bill", !r1.error && r1.data === 3, r1.error?.message ?? `rows=${r1.data}`);

    const splits = async () =>
      (await owner.from("bill_splits").select("id, tenant_id, person_days, total_person_days, amount_cents").eq("bill_id", bill.id)).data ?? [];
    const tsFor = async () => {
      const { data: ts } = await owner.from("property_tenants").select("id, join_date, leave_date").eq("property_id", prop.id);
      return calculateBillSplitCents(
        { amountCents: 10001, serviceStart: "2026-01-01", serviceEnd: "2026-01-31" },
        sortTenantPeriods(ts!.map((t) => ({ tenantId: t.id, joinDate: t.join_date, leaveDate: t.leave_date })))
      ).filter((s) => s.personDays > 0);
    };
    const same = (db: Awaited<ReturnType<typeof splits>>, ts: Awaited<ReturnType<typeof tsFor>>) =>
      db.length === ts.length &&
      ts.every((t) => db.some((d) => d.tenant_id === t.tenantId && d.amount_cents === t.amountCents && d.person_days === t.personDays && d.total_person_days === t.totalPersonDays));

    const s1 = await splits();
    check("initial split matches TS and sums to bill", same(s1, await tsFor()) && s1.reduce((s, r) => s + r.amount_cents, 0) === 10001);

    // b leaves on Jan 10 → property recalc from Jan 10
    const b = tenants!.find((t) => t.display_name === "b")!;
    await owner.from("property_tenants").update({ leave_date: "2026-01-10", status: "departed" }).eq("id", b.id);
    const r2 = await owner.rpc("recalculate_property_splits", { p_property_id: prop.id, p_from: "2026-01-10" });
    check("owner can recalc a property", !r2.error && r2.data === 1, r2.error?.message ?? `bills=${r2.data}`);
    const s2 = await splits();
    check("after departure split matches TS", same(s2, await tsFor()), JSON.stringify(s2.map((r) => [r.person_days, r.amount_cents])));
    check("split rows updated in place (ids kept)", s1.every((r) => s2.some((x) => x.id === r.id)));

    // c's join date moves past the bill → c's row is removed
    const c = tenants!.find((t) => t.display_name === "c")!;
    await owner.from("property_tenants").update({ join_date: "2026-02-05" }).eq("id", c.id);
    await owner.rpc("recalculate_bill_splits", { p_bill_id: bill.id });
    const s3 = await splits();
    check("0-day tenant row removed", !s3.some((r) => r.tenant_id === c.id) && same(s3, await tsFor()));

    const tenantUser = await signIn("navya@example.com");
    const r3 = await tenantUser.rpc("recalculate_bill_splits", { p_bill_id: bill.id });
    check("tenant (other user) is refused", !!r3.error, r3.error?.message ?? "no error!");
    const r4 = await tenantUser.rpc("recalculate_property_splits", { p_property_id: prop.id });
    check("tenant property recalc is refused", !!r4.error, r4.error?.message ?? "no error!");
    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    const r5 = await anon.rpc("recalculate_bill_splits", { p_bill_id: bill.id });
    check("anon is refused", !!r5.error, r5.error?.message ?? "no error!");
  } finally {
    if (propertyId) {
      await svc.from("bills").delete().eq("property_id", propertyId);
      await svc.from("billing_cycles").delete().eq("property_id", propertyId);
      await svc.from("property_tenants").delete().eq("property_id", propertyId);
      const { error } = await svc.from("properties").delete().eq("id", propertyId);
      console.log(error ? `cleanup error: ${error.message}` : "cleaned up temp property");
    }
  }
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
