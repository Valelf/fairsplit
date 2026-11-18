/**
 * Smoke-test RLS hardening against the linked project, as real signed-in users.
 * Uses the pilot seed accounts (SEED_DEMO_PASSWORD). Read-mostly; cleans up what it creates.
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

(async () => {
  const navya = await signIn("navya@example.com");

  const esc = await navya.c.from("profiles").update({ role: "admin" }).eq("id", navya.uid).select();
  const { data: prof } = await service.from("profiles").select("role").eq("id", navya.uid).single();
  check("tenant cannot promote self to admin", prof?.role === "tenant", esc.error?.message);

  const notif = await navya.c.from("notifications").insert({ user_id: navya.uid, type: "x", title: "spam" }).select();
  check("tenant cannot insert notifications", !!notif.error, notif.error?.message);

  const audit = await navya.c.from("audit_log").insert({ action: "forged" }).select();
  check("tenant cannot forge audit log", !!audit.error, audit.error?.message);

  const { data: subs } = await navya.c.from("user_subscriptions").select("id");
  check("tenant cannot see others' subscriptions", (subs ?? []).length === 0);

  const { data: bills } = await navya.c.from("bills").select("id, property_id");
  check("tenant sees McKinney bills", (bills ?? []).length === 6, `${bills?.length} bills`);

  const { data: frisco } = await service.from("properties").select("id").eq("name", "Frisco house").single();
  const { data: fBills } = await navya.c.from("properties").select("id").eq("id", frisco!.id);
  check("tenant cannot see Shekar's other house", (fBills ?? []).length === 0);

  const meta = await service.auth.admin.createUser({
    email: `rls-probe-${Date.now()}@example.com`, password: crypto.randomUUID(), email_confirm: true,
    user_metadata: { role: "admin", full_name: "probe" },
  });
  const { data: probe } = await service.from("profiles").select("role").eq("id", meta.data.user!.id).single();
  check("sign-up metadata cannot set role", probe?.role === "tenant", probe?.role);
  await service.auth.admin.deleteUser(meta.data.user!.id);

  const anonClient = createClient(url, anon, { auth: { persistSession: false } });
  const { data: anonProps } = await anonClient.from("properties").select("id");
  check("anonymous sees no properties", (anonProps ?? []).length === 0);
  const ping = await anonClient.rpc("ping");
  check("keep-alive ping RPC works anonymously", !ping.error, ping.error?.message);

  // ---- Review checks (2026-11-18): RPCs, cross-property integrity, become_owner abuse ----
  const anonOwner = await anonClient.rpc("become_owner");
  check("anonymous cannot call become_owner", !!anonOwner.error, anonOwner.error?.message);
  const anonPaid = await anonClient.rpc("mark_cycle_paid", { p_cycle_id: crypto.randomUUID() });
  check("anonymous cannot call mark_cycle_paid", !!anonPaid.error, anonPaid.error?.message);

  const navyaOwner = await navya.c.rpc("become_owner");
  const { data: navyaRole } = await service.from("profiles").select("role").eq("id", navya.uid).single();
  check("linked tenant cannot become_owner", !!navyaOwner.error && navyaRole?.role === "tenant", navyaOwner.error?.message);

  const { data: mck } = await service.from("properties").select("id").eq("name", "575 McKinney").single();
  const navyaRecalc = await navya.c.rpc("recalculate_property_splits", { p_property_id: mck!.id });
  check("tenant cannot recalculate splits", !!navyaRecalc.error, navyaRecalc.error?.message);

  const shekar = await signIn("shekar@example.com");
  const { data: mckCycle } = await service.from("billing_cycles").select("id").eq("property_id", mck!.id).limit(1).single();
  const crossBill = await shekar.c
    .from("bills")
    .insert({
      cycle_id: mckCycle!.id, property_id: frisco!.id, category: "other", provider: "probe",
      amount_cents: 100, service_start: "2026-01-01", service_end: "2026-01-02", created_by: shekar.uid,
    })
    .select("id");
  check("bill cannot reference another property's cycle", !!crossBill.error, crossBill.error?.message);
  if (crossBill.data?.length) await service.from("bills").delete().eq("id", crossBill.data[0].id);

  const hijack = await shekar.c
    .from("property_tenants")
    .insert({
      property_id: frisco!.id, tenant_id: navya.uid, email: `hijack-${Date.now()}@example.invalid`,
      display_name: "probe", join_date: "2026-01-01", status: "active",
    })
    .select("id");
  check("owner cannot link a user account to a tenancy directly", !!hijack.error, hijack.error?.message);
  if (hijack.data?.length) await service.from("property_tenants").delete().eq("id", hijack.data[0].id);

  // ---- Split rules (bill_split_exclusions) ----
  // Only the exclusion rows are touched (no recalculation), and they're removed right away.
  const { data: mckBill } = await service.from("bills").select("id").eq("property_id", mck!.id).limit(1).single();
  const { data: navyaPt } = await service
    .from("property_tenants").select("id").eq("property_id", mck!.id).eq("tenant_id", navya.uid).single();
  const tenantExcl = await navya.c
    .from("bill_split_exclusions").insert({ bill_id: mckBill!.id, property_tenant_id: navyaPt!.id }).select();
  check("tenant cannot create split exclusions", !!tenantExcl.error || !tenantExcl.data?.length, tenantExcl.error?.message);
  if (tenantExcl.data?.length) await service.from("bill_split_exclusions").delete().eq("bill_id", mckBill!.id);
  const ownerExcl = await shekar.c
    .from("bill_split_exclusions")
    .insert({ bill_id: mckBill!.id, property_tenant_id: navyaPt!.id, reason: "security-check probe" })
    .select();
  try {
    check("owner can exclude a tenant from a bill", !ownerExcl.error, ownerExcl.error?.message);
    const { data: seen } = await navya.c.from("bill_split_exclusions").select("bill_id").eq("bill_id", mckBill!.id);
    check("tenant can read their property's exclusions", (seen ?? []).length === 1, `${seen?.length} rows`);
    const { data: anonSeen } = await anonClient.from("bill_split_exclusions").select("bill_id");
    check("anonymous sees no exclusions", (anonSeen ?? []).length === 0);
    const { data: fTenant } = await service.from("property_tenants").select("id").eq("property_id", frisco!.id).limit(1).maybeSingle();
    if (fTenant) {
      const crossExcl = await shekar.c
        .from("bill_split_exclusions").insert({ bill_id: mckBill!.id, property_tenant_id: fTenant.id }).select();
      check("exclusion cannot name another property's tenant", !!crossExcl.error, crossExcl.error?.message);
      if (crossExcl.data?.length) await service.from("bill_split_exclusions").delete().eq("property_tenant_id", fTenant.id);
    }
  } finally {
    await service.from("bill_split_exclusions").delete().eq("bill_id", mckBill!.id);
  }

  // A landlord demoted by an admin must not be able to promote themselves back.
  const demotedEmail = `demoted-probe-${Date.now()}@example.com`;
  const demotedPw = crypto.randomUUID();
  const demoted = await service.auth.admin.createUser({ email: demotedEmail, password: demotedPw, email_confirm: true });
  const demotedId = demoted.data.user!.id;
  try {
    await service.from("audit_log").insert({
      user_id: demotedId, action: "change_role", table_name: "profiles", record_id: demotedId,
      old_data: { role: "owner" }, new_data: { role: "tenant" },
    });
    const dc = createClient(url, anon, { auth: { persistSession: false } });
    await dc.auth.signInWithPassword({ email: demotedEmail, password: demotedPw });
    const back = await dc.rpc("become_owner");
    const { data: dRole } = await service.from("profiles").select("role").eq("id", demotedId).single();
    check("admin-demoted account cannot become_owner again", !!back.error && dRole?.role === "tenant", back.error?.message);
  } finally {
    await service.from("audit_log").delete().eq("record_id", demotedId);
    await service.auth.admin.deleteUser(demotedId);
  }

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e.message ?? e); process.exit(1); });
