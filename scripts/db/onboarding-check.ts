/**
 * Live check of the become_owner() RPC: a fresh user can become an owner (once, idempotently),
 * an invited tenant cannot. Creates a throwaway user and deletes it and its rows afterwards.
 * Usage: npx tsx scripts/db/onboarding-check.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
let failures = 0;
const check = (n: string, ok: boolean, d = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? `  (${d})` : ""}`); if (!ok) failures++; };

(async () => {
  const email = `owner-probe-${Date.now()}@example.com`;
  const pw = crypto.randomUUID();
  const created = await service.auth.admin.createUser({ email, password: pw, email_confirm: true, user_metadata: { full_name: "Probe" } });
  const uid = created.data.user!.id;
  try {
    const c = createClient(url, anon, { auth: { persistSession: false } });
    await c.auth.signInWithPassword({ email, password: pw });
    const direct = await c.from("profiles").update({ role: "owner" }).eq("id", uid).select();
    check("direct role update still blocked", !!direct.error, direct.error?.message);
    const r = await c.rpc("become_owner");
    check("fresh user become_owner ok", !r.error && r.data === "owner", r.error?.message);
    const { data: p } = await service.from("profiles").select("role").eq("id", uid).single();
    check("role now owner", p?.role === "owner");
    const { data: subs } = await service.from("user_subscriptions").select("id, subscription_plans(name)").eq("user_id", uid);
    check("free subscription created", subs?.length === 1, JSON.stringify(subs));
    const { data: audit } = await service.from("audit_log").select("id").eq("user_id", uid).eq("action", "become_owner");
    check("audit row written", audit?.length === 1);
    const again = await c.rpc("become_owner");
    check("idempotent second call", !again.error && again.data === "owner", again.error?.message);
    const { data: subs2 } = await service.from("user_subscriptions").select("id").eq("user_id", uid);
    check("no duplicate subscription", subs2?.length === 1);
    const back = await c.from("profiles").update({ role: "admin" }).eq("id", uid).select();
    check("owner still cannot set admin", !!back.error, back.error?.message);
    const prop = await c.from("properties").insert({ owner_id: uid, name: "Probe house", address_line1: "", city: "", state: "", zip_code: "" }).select().single();
    check("new owner can create property with blank address", !prop.error, prop.error?.message);

    const n = createClient(url, anon, { auth: { persistSession: false } });
    await n.auth.signInWithPassword({ email: "navya@example.com", password: process.env.SEED_DEMO_PASSWORD! });
    const nr = await n.rpc("become_owner");
    check("seeded tenant refused", !!nr.error, nr.error?.message);
    const { data: np } = await service.from("profiles").select("role").eq("email", "navya@example.com").single();
    check("navya still tenant", np?.role === "tenant");

    const a = createClient(url, anon, { auth: { persistSession: false } });
    const ar = await a.rpc("become_owner");
    check("anon refused", !!ar.error, ar.error?.message);
  } finally {
    await service.from("properties").delete().eq("owner_id", uid);
    await service.from("audit_log").delete().eq("user_id", uid);
    await service.from("user_subscriptions").delete().eq("user_id", uid);
    const del = await service.auth.admin.deleteUser(uid);
    check("cleanup: user deleted", !del.error, del.error?.message);
  }
  console.log(failures ? `${failures} FAILED` : "All passed");
  process.exit(failures ? 1 : 0);
})();

