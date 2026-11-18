/**
 * Live RLS / RPC checks for payment tracking, as real signed-in pilot users.
 * Usage: npx tsx scripts/db/payments-check.ts
 * Restores every split it touches and removes any payment-method row it creates.
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
};
async function signIn(email: string) {
  const c = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: process.env.SEED_DEMO_PASSWORD! });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return { c, uid: data.user!.id };
}

type Split = {
  id: string; tenant_id: string; payment_status: string; marked_paid_at: string | null;
  confirmed_at: string | null; confirmed_by: string | null; payment_note: string | null;
};
const COLS = "id, tenant_id, payment_status, marked_paid_at, confirmed_at, confirmed_by, payment_note";

(async () => {
  const navya = await signIn("navya@example.com");
  const vineesh = await signIn("vineesh@example.com");
  const shekar = await signIn("shekar@example.com");

  const { data: navyaPt } = await service.from("property_tenants").select("id, property_id")
    .eq("tenant_id", navya.uid).limit(1).single();
  const { data: vineeshPt } = await service.from("property_tenants").select("id")
    .eq("tenant_id", vineesh.uid).eq("property_id", navyaPt!.property_id).single();

  // A cycle where both Navya and Vineesh have splits.
  const { data: navyaSplits } = await service.from("bill_splits").select("bill_id, bills!inner(cycle_id)")
    .eq("tenant_id", navyaPt!.id);
  const cycleIds = Array.from(new Set((navyaSplits ?? []).map((s: any) => s.bills.cycle_id)));
  let cycleId: string | null = null;
  for (const id of cycleIds) {
    const { data } = await service.from("bill_splits").select("id, bills!inner(cycle_id)")
      .eq("tenant_id", vineeshPt!.id).eq("bills.cycle_id", id);
    if ((data ?? []).length > 0) { cycleId = id; break; }
  }
  if (!cycleId) throw new Error("No shared cycle found for navya + vineesh");

  const { data: cycleBills } = await service.from("bills").select("id").eq("cycle_id", cycleId);
  const billIds = (cycleBills ?? []).map((b) => b.id);
  const { data: original } = await service.from("bill_splits").select(COLS).in("bill_id", billIds);
  const snapshot = (original ?? []) as Split[];
  const statusOf = async (ptId: string) => {
    const { data } = await service.from("bill_splits").select("payment_status").in("bill_id", billIds).eq("tenant_id", ptId);
    return Array.from(new Set((data ?? []).map((d) => d.payment_status))).join(",");
  };

  let createdMethods = false;
  try {
    // Start from a known state.
    await service.from("bill_splits").update({ payment_status: "owed", marked_paid_at: null, confirmed_at: null, confirmed_by: null, payment_note: null }).in("bill_id", billIds);

    const navyaSplit = snapshot.find((s) => s.tenant_id === navyaPt!.id)!;
    const direct = await navya.c.from("bill_splits").update({ payment_status: "confirmed" }).eq("id", navyaSplit.id).select();
    check("tenant cannot update bill_splits directly", (direct.data ?? []).length === 0 && (await statusOf(navyaPt!.id)) === "owed", direct.error?.message);

    const mark = await navya.c.rpc("mark_cycle_paid", { p_cycle_id: cycleId, p_note: "rls check" });
    check("tenant can mark own cycle paid", !mark.error && (mark.data as number) > 0, mark.error?.message ?? `${mark.data} splits`);
    check("…only their own splits change", (await statusOf(navyaPt!.id)) === "marked_paid" && (await statusOf(vineeshPt!.id)) === "owed");

    const vConfirm = await vineesh.c.rpc("confirm_tenant_cycle_payment", { p_cycle_id: cycleId, p_property_tenant_id: navyaPt!.id });
    check("another tenant cannot confirm", !!vConfirm.error, vConfirm.error?.message);
    const selfConfirm = await navya.c.rpc("confirm_tenant_cycle_payment", { p_cycle_id: cycleId, p_property_tenant_id: navyaPt!.id });
    check("tenant cannot confirm own payment", !!selfConfirm.error, selfConfirm.error?.message);
    const vReopen = await vineesh.c.rpc("reopen_tenant_cycle_payment", { p_cycle_id: cycleId, p_property_tenant_id: navyaPt!.id });
    check("tenant cannot reopen", !!vReopen.error, vReopen.error?.message);

    const confirm = await shekar.c.rpc("confirm_tenant_cycle_payment", { p_cycle_id: cycleId, p_property_tenant_id: navyaPt!.id });
    check("owner can confirm", !confirm.error && (await statusOf(navyaPt!.id)) === "confirmed", confirm.error?.message);

    const unmark = await navya.c.rpc("unmark_cycle_paid", { p_cycle_id: cycleId });
    check("tenant cannot undo a confirmed payment", !!unmark.error && (await statusOf(navyaPt!.id)) === "confirmed", unmark.error?.message);

    const reopen = await shekar.c.rpc("reopen_tenant_cycle_payment", { p_cycle_id: cycleId, p_property_tenant_id: navyaPt!.id });
    check("owner can reopen", !reopen.error && (await statusOf(navyaPt!.id)) === "owed", reopen.error?.message);

    await navya.c.rpc("mark_cycle_paid", { p_cycle_id: cycleId });
    const undo = await navya.c.rpc("unmark_cycle_paid", { p_cycle_id: cycleId });
    check("tenant can undo an unconfirmed mark", !undo.error && (await statusOf(navyaPt!.id)) === "owed", undo.error?.message);

    const anonClient = createClient(url, anon, { auth: { persistSession: false } });
    const anonMark = await anonClient.rpc("mark_cycle_paid", { p_cycle_id: cycleId });
    check("anonymous cannot call payment RPCs", !!anonMark.error, anonMark.error?.message);

    // Owner payment methods
    const { data: existing } = await service.from("owner_payment_methods").select("owner_id").eq("owner_id", shekar.uid).maybeSingle();
    if (!existing) {
      await service.from("owner_payment_methods").insert({ owner_id: shekar.uid, venmo_handle: "rls-check" });
      createdMethods = true;
    }
    const forge = await navya.c.from("owner_payment_methods").upsert({ owner_id: shekar.uid, venmo_handle: "attacker" }).select();
    const { data: after } = await service.from("owner_payment_methods").select("venmo_handle").eq("owner_id", shekar.uid).single();
    check("tenant cannot write owner's payment methods", !!forge.error && after?.venmo_handle !== "attacker", forge.error?.message);
    const read = await navya.c.from("owner_payment_methods").select("owner_id").eq("owner_id", shekar.uid);
    check("tenant can read their owner's payment methods", (read.data ?? []).length === 1, read.error?.message);
    const anonRead = await anonClient.from("owner_payment_methods").select("owner_id");
    check("anonymous cannot read payment methods", (anonRead.data ?? []).length === 0);
  } finally {
    for (const s of snapshot) {
      const { id, tenant_id: _t, ...rest } = s;
      await service.from("bill_splits").update(rest).eq("id", id);
    }
    if (createdMethods) await service.from("owner_payment_methods").delete().eq("owner_id", shekar.uid);
  }

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll payment checks passed.");
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e.message ?? e); process.exit(1); });
