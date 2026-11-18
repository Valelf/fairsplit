/**
 * Read-only check that public.recalculate_bill_splits (SQL) matches the TypeScript
 * split algorithm (person-days / equal_present, with exclusions), and that recalculating the
 * stored bills is a no-op. Also builds a throwaway property with a bill per split method (and
 * with exclusions) and verifies SQL == TS on it.
 *
 * Runs everything inside one transaction that is ROLLED BACK, so no data changes (the throwaway
 * property is never visible to anyone else and needs no cleanup).
 * Usage: npx tsx scripts/db/recalc-check.ts [--sql <migration file to load first>]
 */
import { readFileSync } from "fs";
import type { Client } from "pg";
import { connect } from "./_conn";
import { calculateBillSplitCents, sortTenantPeriods, type SplitMethod } from "../../lib/calculations/person-days";

type Row = { tenant_id: string; person_days: number; total_person_days: number; amount_cents: number; share_count: number | null };
const key = (rows: Row[]) =>
  JSON.stringify(
    [...rows]
      .sort((a, b) => (a.tenant_id < b.tenant_id ? -1 : 1))
      .map((r) => [r.tenant_id, r.person_days, r.total_person_days, r.amount_cents, r.share_count ?? null])
  );
const ymd = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

type Bill = {
  id: string;
  property_id: string;
  amount_cents: number;
  service_start: string;
  service_end: string;
  provider: string;
  property: string;
  split_method: SplitMethod;
};

const BILLS_SQL =
  "select b.id, b.property_id, b.amount_cents, b.service_start, b.service_end, b.provider, b.split_method, p.name as property from bills b join properties p on p.id = b.property_id";
const SPLITS_SQL =
  "select tenant_id, person_days, total_person_days, amount_cents, share_count from bill_splits where bill_id = $1";

async function tsSplits(c: Client, b: Bill): Promise<Row[]> {
  const tenants = (await c.query("select id, join_date, leave_date from property_tenants where property_id = $1", [b.property_id])).rows;
  const excluded = (await c.query("select property_tenant_id from bill_split_exclusions where bill_id = $1", [b.id])).rows.map(
    (r) => r.property_tenant_id as string
  );
  return calculateBillSplitCents(
    { amountCents: b.amount_cents, serviceStart: ymd(b.service_start), serviceEnd: ymd(b.service_end) },
    sortTenantPeriods(
      tenants.map((t) => ({ tenantId: t.id, joinDate: ymd(t.join_date), leaveDate: t.leave_date ? ymd(t.leave_date) : null }))
    ),
    { method: b.split_method, excludedTenantIds: excluded }
  )
    .filter((s) => s.personDays > 0)
    .map((s) => ({
      tenant_id: s.tenantId,
      person_days: s.personDays,
      total_person_days: s.totalPersonDays,
      amount_cents: s.amountCents,
      share_count: s.shareCount ?? null,
    }));
}

/** Recalculate one bill and compare with TS. noop=true also requires the stored rows to be unchanged. */
async function checkBill(c: Client, b: Bill, noop: boolean): Promise<boolean> {
  const ts = await tsSplits(c, b);
  const before = (await c.query(SPLITS_SQL, [b.id])).rows as Row[];
  await c.query("select public.recalculate_bill_splits($1)", [b.id]);
  const after = (await c.query(SPLITS_SQL, [b.id])).rows as Row[];
  const sum = after.reduce((s, r) => s + r.amount_cents, 0);
  const okTs = key(ts) === key(after);
  const okNoop = !noop || key(before) === key(after);
  const okSum = after.length === 0 || sum === b.amount_cents;
  const ok = okTs && okNoop && okSum;
  console.log(
    `${ok ? "OK  " : "FAIL"} ${b.property} ${ymd(b.service_start)}..${ymd(b.service_end)} ${b.provider} [${b.split_method}] ${b.amount_cents}c rows=${after.length} sum=${sum}` +
      (okTs ? "" : " [SQL != TS]") +
      (okNoop ? "" : " [changed stored splits]") +
      (okSum ? "" : " [sum mismatch]")
  );
  if (!okTs || !okNoop) console.log("   before", key(before), "\n   after ", key(after), "\n   ts    ", key(ts));
  return ok;
}

/** Throwaway property (inside the rolled-back transaction) exercising every method + exclusions. */
async function checkSplitRules(c: Client): Promise<number> {
  let failures = 0;
  const owner = (await c.query("select owner_id from properties order by created_at limit 1")).rows[0]?.owner_id;
  if (!owner) {
    console.log("SKIP split-rule cases: no property owner to borrow");
    return 0;
  }
  const prop = (
    await c.query(
      "insert into properties (owner_id, name, address_line1, city, state, zip_code) values ($1, 'zz recalc-check temp', 'TBD', 'Nowhere', 'TX', '00000') returning id",
      [owner]
    )
  ).rows[0].id;
  const cycle = (
    await c.query(
      "insert into billing_cycles (property_id, label, status, created_by) values ($1, 'temp', 'open', $2) returning id",
      [prop, owner]
    )
  ).rows[0].id;
  const periods: Array<[string, string | null]> = [
    ["2026-01-01", null],
    ["2026-01-01", null],
    ["2026-01-10", "2026-01-25"],
    ["2026-01-29", null],
    ["2026-03-01", null], // no days in January
  ];
  const tenants: string[] = [];
  for (let i = 0; i < periods.length; i++) {
    const res = await c.query(
      "insert into property_tenants (property_id, email, display_name, join_date, leave_date, status) values ($1, $2, $3, $4, $5, 'invited') returning id",
      [prop, `recalc-check-${i}@example.invalid`, `Temp ${i}`, periods[i][0], periods[i][1]]
    );
    tenants.push(res.rows[0].id);
  }
  const cases: Array<{ method: SplitMethod; amount: number; exclude: number[] }> = [
    { method: "person_days", amount: 10001, exclude: [] },
    { method: "equal_present", amount: 10001, exclude: [] },
    { method: "equal_present", amount: 7, exclude: [] },
    { method: "person_days", amount: 9549, exclude: [0] },
    { method: "equal_present", amount: 9549, exclude: [1, 4] },
    { method: "equal_present", amount: 5000, exclude: [0, 1, 2, 3, 4] },
  ];
  for (const k of cases) {
    const bill = (
      await c.query(
        "insert into bills (cycle_id, property_id, category, provider, amount_cents, service_start, service_end, created_by, split_method) values ($1, $2, 'internet', $3, $4, '2026-01-01', '2026-01-31', $5, $6) returning id",
        [cycle, prop, `temp excl=${k.exclude.join("+") || "none"}`, k.amount, owner, k.method]
      )
    ).rows[0].id;
    for (const i of k.exclude) {
      await c.query("insert into bill_split_exclusions (bill_id, property_tenant_id, reason) values ($1, $2, 'check')", [
        bill,
        tenants[i],
      ]);
    }
    const b = (await c.query(`${BILLS_SQL} where b.id = $1`, [bill])).rows[0] as Bill;
    if (!(await checkBill(c, b, false))) failures++;
    if (k.exclude.length === periods.length) {
      const n = (await c.query("select count(*)::int as n from bill_splits where bill_id = $1", [bill])).rows[0].n;
      if (n !== 0) {
        failures++;
        console.log(`FAIL everyone excluded should give 0 rows, got ${n}`);
      }
    }
    // switching the method afterwards must round-trip too
    const other: SplitMethod = k.method === "person_days" ? "equal_present" : "person_days";
    await c.query("update bills set split_method = $2 where id = $1", [bill, other]);
    const b2 = (await c.query(`${BILLS_SQL} where b.id = $1`, [bill])).rows[0] as Bill;
    if (!(await checkBill(c, b2, false))) failures++;
  }
  return failures;
}

(async () => {
  const sqlIdx = process.argv.indexOf("--sql");
  const c = await connect();
  // Return DATE columns as plain strings.
  const { types } = await import("pg");
  types.setTypeParser(1082, (v: string) => v);
  let failures = 0;
  await c.query("begin");
  try {
    if (sqlIdx > 0) await c.query(readFileSync(process.argv[sqlIdx + 1], "utf8"));
    const bills = (await c.query(`${BILLS_SQL} order by p.name, b.service_start`)).rows as Bill[];
    console.log(`Checking ${bills.length} stored bills…`);
    for (const b of bills) if (!(await checkBill(c, b, true))) failures++;
    console.log("Checking split rules on a throwaway property…");
    failures += await checkSplitRules(c);
  } finally {
    await c.query("rollback");
    await c.end();
  }
  console.log(
    failures === 0 ? "All bills match (transaction rolled back)." : `${failures} check(s) failed (transaction rolled back).`
  );
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
