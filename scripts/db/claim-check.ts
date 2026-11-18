/** End-to-end check of the invite claim RPCs for the pending invite to claim-test@example.com (created in the UI). Cleans up after itself. */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const svc = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
(async () => {
  const { data: row } = await svc.from("property_tenants").select("id, invite_token, status").eq("email", "claim-test@example.com").single();
  console.log("token row:", row?.status, row?.invite_token?.slice(0, 8));
  const a = createClient(url, anon, { auth: { persistSession: false } });
  console.log("get_invite (anon):", JSON.stringify((await a.rpc("get_invite", { p_token: row!.invite_token })).data));
  const pw = crypto.randomUUID();
  const { data: u } = await svc.auth.admin.createUser({ email: "claim-test@example.com", password: pw, email_confirm: true });
  const wrong = createClient(url, anon, { auth: { persistSession: false } });
  await wrong.auth.signInWithPassword({ email: "navya@example.com", password: process.env.SEED_DEMO_PASSWORD! });
  console.log("claim by wrong user:", (await wrong.rpc("claim_invite", { p_token: row!.invite_token })).error?.message);
  const c = createClient(url, anon, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email: "claim-test@example.com", password: pw });
  const r = await c.rpc("claim_invite", { p_token: row!.invite_token });
  console.log("claim by invitee:", r.error?.message ?? "ok");
  const { data: after } = await svc.from("property_tenants").select("status, tenant_id, claimed_at").eq("id", row!.id).single();
  console.log("after:", after?.status, after?.tenant_id === u.user!.id, !!after?.claimed_at);
  const { data: props } = await c.from("properties").select("name");
  console.log("invitee sees:", props?.map((p) => p.name));
  // cleanup
  await svc.from("property_tenants").delete().eq("id", row!.id);
  await svc.auth.admin.deleteUser(u.user!.id);
  console.log("cleaned up");
})();
