/**
 * End-to-end check of the landlord onboarding pages against a running app (npm run build && npm start).
 * Creates a throwaway user, walks the wizard states via the DB, fetches each page with that user's
 * session cookie, then deletes the user and everything it created.
 * Usage: APP_URL=http://localhost:3000 npx tsx scripts/db/onboarding-flow-check.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
import { calculateBillSplitCents } from "../../lib/calculations/person-days";
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const ref = url.match(/https:\/\/([^.]+)\./)![1];
const base = process.env.APP_URL ?? "http://localhost:3000";
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
let failures = 0;
const check = (n: string, ok: boolean, d = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? `  (${d})` : ""}`); if (!ok) failures++; };

function cookieHeader(session: unknown) {
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const name = `sb-${ref}-auth-token`;
  const size = 3180;
  if (value.length <= size) return `${name}=${value}`;
  const parts: string[] = [];
  for (let i = 0; i * size < value.length; i++) parts.push(`${name}.${i}=${value.slice(i * size, (i + 1) * size)}`);
  return parts.join("; ");
}

async function get(p: string, cookie: string) {
  const r = await fetch(base + p, { headers: { cookie }, redirect: "manual" });
  return { status: r.status, location: r.headers.get("location"), html: await r.text() };
}

(async () => {
  const email = `flow-probe-${Date.now()}@example.com`;
  const pw = crypto.randomUUID();
  const created = await service.auth.admin.createUser({ email, password: pw, email_confirm: true, user_metadata: { full_name: "Flow Probe" } });
  const uid = created.data.user!.id;
  try {
    const c = createClient(url, anon, { auth: { persistSession: false } });
    const { data: s } = await c.auth.signInWithPassword({ email, password: pw });
    const cookie = cookieHeader(s.session);

    const signup = await fetch(base + "/signup", { redirect: "manual" });
    check("/signup public", signup.status === 200, String(signup.status));

    let r = await get("/onboarding", cookie);
    check("tenant sees become-owner card", r.html.includes("Set up my landlord account"), `${r.status} ${r.location}`);

    await c.rpc("become_owner");
    r = await get("/dashboard/owner/dashboard", cookie);
    check("empty owner dashboard points to onboarding", r.html.includes("Set up your first house") && r.html.includes('href="/onboarding"'), `${r.status} ${r.location}`);
    r = await get("/onboarding", cookie);
    check("step 1 house", r.html.includes("Name the house") && r.html.includes("Step <!-- -->1"), String(r.status));

    const { data: prop, error: pe } = await c.from("properties").insert({ owner_id: uid, name: "Probe house", address_line1: "", city: "", state: "", zip_code: "" }).select().single();
    check("insert property", !pe, pe?.message);
    r = await get("/onboarding", cookie);
    check("step 2 tenants", r.html.includes("Add a tenant"));
    r = await get("/onboarding?step=bill", cookie);
    check("skip to bill shows no-tenants hint", r.html.includes("Add tenants first"));

    const t1 = await c.from("property_tenants").insert({ property_id: prop!.id, email: "a-probe@example.com", display_name: "Ana", join_date: "2026-10-01", status: "invited", tenant_id: null, leave_date: null }).select().single();
    const t2 = await c.from("property_tenants").insert({ property_id: prop!.id, email: "b-probe@example.com", display_name: "Ben", join_date: "2026-10-17", status: "invited", tenant_id: null, leave_date: null }).select().single();
    check("insert tenants", !t1.error && !t2.error, t1.error?.message ?? t2.error?.message);
    r = await get("/onboarding?step=tenants", cookie);
    check("tenants listed with invite links", r.html.includes("Ana") && r.html.includes("Invite link for Ben"));
    r = await get("/onboarding", cookie);
    check("step 3 bill", r.html.includes("Save and split"));

    const cyc = await c.from("billing_cycles").insert({ property_id: prop!.id, label: "Oct 2026", status: "draft", start_date: "2026-10-01", end_date: "2026-10-31", created_by: uid }).select().single();
    check("insert cycle with dates", !cyc.error, cyc.error?.message);
    const bill = await c.from("bills").insert({ cycle_id: cyc.data!.id, property_id: prop!.id, category: "electricity", provider: "City Power", amount_cents: 10000, service_start: "2026-10-01", service_end: "2026-10-31", source: "manual", created_by: uid }).select().single();
    check("insert bill", !bill.error, bill.error?.message);
    const splits = calculateBillSplitCents({ amountCents: 10000, serviceStart: "2026-10-01", serviceEnd: "2026-10-31" }, [
      { tenantId: t1.data!.id, joinDate: "2026-10-01", leaveDate: null },
      { tenantId: t2.data!.id, joinDate: "2026-10-17", leaveDate: null },
    ]);
    const ins = await c.from("bill_splits").insert(splits.map((x) => ({ bill_id: bill.data!.id, property_id: prop!.id, tenant_id: x.tenantId, person_days: x.personDays, total_person_days: x.totalPersonDays, amount_cents: x.amountCents })));
    check("insert splits", !ins.error, ins.error?.message);
    r = await get("/onboarding", cookie);
    check("step 4 split preview", r.html.includes("31 of 46 person-days") && r.html.includes("$67.39"), r.html.match(/\d+ of \d+ person-days[^<]*/)?.[0]);

    await c.from("profiles").update({ onboarding_completed: true }).eq("id", uid);
    r = await get("/onboarding", cookie);
    check("completed owner redirected to dashboard", r.status === 307 && (r.location ?? "").includes("/dashboard/owner/dashboard"), `${r.status} ${r.location}`);
    r = await get("/dashboard/owner/dashboard", cookie);
    check("dashboard shows house", r.html.includes("Probe house"));
  } finally {
    const { data: props } = await service.from("properties").select("id").eq("owner_id", uid);
    for (const p of props ?? []) {
      await service.from("bill_splits").delete().eq("property_id", p.id);
      await service.from("bills").delete().eq("property_id", p.id);
      await service.from("billing_cycles").delete().eq("property_id", p.id);
      await service.from("property_tenants").delete().eq("property_id", p.id);
      await service.from("properties").delete().eq("id", p.id);
    }
    await service.from("audit_log").delete().eq("user_id", uid);
    await service.from("user_subscriptions").delete().eq("user_id", uid);
    await service.from("notifications").delete().eq("user_id", uid);
    const del = await service.auth.admin.deleteUser(uid);
    check("cleanup", !del.error, del.error?.message);
  }
  console.log(failures ? `${failures} FAILED` : "All passed");
  process.exit(failures ? 1 : 0);
})();
