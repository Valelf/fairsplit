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

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e.message ?? e); process.exit(1); });
