/**
 * Seed the pilot: platform admin, Shekar (owner, founding plan), his two houses,
 * McKinney tenants and the Sept–Nov 2025 history. Splits come from the real
 * person-days algorithm (lib/calculations/person-days.ts), not hand-typed numbers.
 *
 * Skips users that already exist; skips property seeding if the owner already has properties.
 * Data: scripts/pilot/pilot-data.json, overridden by scripts/pilot/pilot-data.local.json (gitignored).
 * Env (.env.local): SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_DEMO_PASSWORD.
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { calculateBillSplitCents } from "../lib/calculations/person-days";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const demoPassword = process.env.SEED_DEMO_PASSWORD;
if (!url || !key || !adminEmail || !adminPassword || !demoPassword) {
  console.error(
    "Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_DEMO_PASSWORD"
  );
  process.exit(1);
}
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const base = JSON.parse(readFileSync(path.resolve(__dirname, "pilot/pilot-data.json"), "utf8"));
const localPath = path.resolve(__dirname, "pilot/pilot-data.local.json");
const data = existsSync(localPath) ? { ...base, ...JSON.parse(readFileSync(localPath, "utf8")) } : base;

type Role = "admin" | "owner" | "tenant";

async function ensureUser(email: string, password: string, fullName: string, role: Role) {
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
  let user = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    const { data: created, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !created.user) throw new Error(`createUser ${email}: ${error?.message}`);
    user = created.user;
  }
  const { error } = await sb.from("profiles").update({ role, full_name: fullName }).eq("id", user.id);
  if (error) throw new Error(`set role ${email}: ${error.message}`);
  return user.id;
}

function must<T>(r: { data: T | null; error: { message: string } | null }, what: string): T {
  if (r.error || r.data === null) throw new Error(`${what}: ${r.error?.message ?? "no data"}`);
  return r.data;
}

const dollars = (c: number) => `$${(c / 100).toFixed(2)}`;

(async () => {
  await ensureUser(adminEmail, adminPassword, "Val (admin)", "admin");
  console.log(`admin    ${adminEmail}`);
  const ownerId = await ensureUser(data.owner.email, demoPassword, data.owner.fullName, "owner");
  console.log(`owner    ${data.owner.email}`);

  const { count } = await sb
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId);
  if ((count ?? 0) > 0) {
    console.log("Owner already has properties; skipping property seed.");
    return;
  }

  const plan = must(
    await sb.from("subscription_plans").select("id").eq("name", data.foundingPlan.plan).single(),
    "plan"
  ) as { id: string };
  must(
    await sb
      .from("user_subscriptions")
      .insert({
        user_id: ownerId,
        plan_id: plan.id,
        status: "active",
        comp_until: data.foundingPlan.compUntil,
        comp_note: data.foundingPlan.note,
      })
      .select()
      .single(),
    "subscription"
  );
  console.log(`plan     ${data.foundingPlan.plan}, comped until ${data.foundingPlan.compUntil}`);

  for (const p of data.properties) {
    const prop = must(
      await sb
        .from("properties")
        .insert({
          owner_id: ownerId,
          name: p.name,
          address_line1: p.address_line1,
          city: p.city,
          state: p.state,
          zip_code: p.zip_code,
          transparency_level: "full",
        })
        .select("id")
        .single(),
      `property ${p.name}`
    ) as { id: string };
    console.log(`property ${p.name}`);

    const periods: { tenantId: string; joinDate: string; leaveDate: string | null }[] = [];
    for (const t of p.tenants) {
      const userId = await ensureUser(t.email, demoPassword, t.display_name, "tenant");
      const row = must(
        await sb
          .from("property_tenants")
          .insert({
            property_id: prop.id,
            tenant_id: userId,
            email: t.email,
            display_name: t.display_name,
            join_date: t.join_date,
            leave_date: t.leave_date ?? null,
            status: t.leave_date ? "departed" : "active",
            claimed_at: new Date().toISOString(),
          })
          .select("id, join_date, leave_date")
          .single(),
        `tenant ${t.display_name}`
      ) as { id: string; join_date: string; leave_date: string | null };
      periods.push({ tenantId: row.id, joinDate: row.join_date, leaveDate: row.leave_date });
    }

    for (const cy of p.cycles) {
      const cycle = must(
        await sb
          .from("billing_cycles")
          .insert({
            property_id: prop.id,
            label: cy.label,
            status: cy.status,
            start_date: cy.start_date,
            end_date: cy.end_date,
            created_by: ownerId,
          })
          .select("id")
          .single(),
        `cycle ${cy.label}`
      ) as { id: string };

      for (const b of cy.bills) {
        const bill = must(
          await sb
            .from("bills")
            .insert({ ...b, cycle_id: cycle.id, property_id: prop.id, source: "manual", created_by: ownerId })
            .select("id")
            .single(),
          `bill ${b.provider}`
        ) as { id: string };
        const splits = calculateBillSplitCents(
          { amountCents: b.amount_cents, serviceStart: b.service_start, serviceEnd: b.service_end },
          periods
        ).filter((s) => s.personDays > 0);
        must(
          await sb
            .from("bill_splits")
            .insert(
              splits.map((s) => ({
                bill_id: bill.id,
                property_id: prop.id,
                tenant_id: s.tenantId,
                person_days: s.personDays,
                total_person_days: s.totalPersonDays,
                amount_cents: s.amountCents,
              }))
            )
            .select(),
          `splits ${b.provider}`
        );
        const sum = splits.reduce((x, s) => x + s.amountCents, 0);
        console.log(
          `  ${cy.label.padEnd(16)} ${b.provider.padEnd(17)} ${dollars(b.amount_cents).padStart(8)}  splits ${dollars(sum)}`
        );
      }
    }
  }
  console.log("Pilot seed complete.");
})().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
