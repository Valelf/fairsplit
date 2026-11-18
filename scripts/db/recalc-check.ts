/**
 * Read-only check that public.recalculate_bill_splits (SQL) matches the TypeScript
 * person-days algorithm, and that recalculating the stored bills is a no-op.
 *
 * Runs everything inside one transaction that is ROLLED BACK, so no data changes.
 * Usage: npx tsx scripts/db/recalc-check.ts [--sql <migration file to load first>]
 */
import { readFileSync } from "fs";
import { connect } from "./_conn";
import { calculateBillSplitCents, sortTenantPeriods } from "../../lib/calculations/person-days";

type Row = { tenant_id: string; person_days: number; total_person_days: number; amount_cents: number };
const key = (rows: Row[]) =>
  JSON.stringify(
    [...rows].sort((a, b) => (a.tenant_id < b.tenant_id ? -1 : 1)).map((r) => [r.tenant_id, r.person_days, r.total_person_days, r.amount_cents])
  );
const ymd = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

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
    const bills = (
      await c.query(
        "select b.id, b.property_id, b.amount_cents, b.service_start, b.service_end, b.provider, p.name as property from bills b join properties p on p.id = b.property_id order by p.name, b.service_start"
      )
    ).rows;
    console.log(`Checking ${bills.length} bills…`);
    for (const b of bills) {
      const tenants = (await c.query("select id, join_date, leave_date from property_tenants where property_id = $1", [b.property_id])).rows;
      const ts = calculateBillSplitCents(
        { amountCents: b.amount_cents, serviceStart: ymd(b.service_start), serviceEnd: ymd(b.service_end) },
        sortTenantPeriods(tenants.map((t) => ({ tenantId: t.id, joinDate: ymd(t.join_date), leaveDate: t.leave_date ? ymd(t.leave_date) : null })))
      )
        .filter((s) => s.personDays > 0)
        .map((s) => ({ tenant_id: s.tenantId, person_days: s.personDays, total_person_days: s.totalPersonDays, amount_cents: s.amountCents }));
      const q = "select tenant_id, person_days, total_person_days, amount_cents from bill_splits where bill_id = $1";
      const before = (await c.query(q, [b.id])).rows as Row[];
      await c.query("select public.recalculate_bill_splits($1)", [b.id]);
      const after = (await c.query(q, [b.id])).rows as Row[];
      const sum = after.reduce((s, r) => s + r.amount_cents, 0);
      const okTs = key(ts) === key(after);
      const okNoop = key(before) === key(after);
      const okSum = after.length === 0 || sum === b.amount_cents;
      const ok = okTs && okNoop && okSum;
      if (!ok) failures++;
      console.log(
        `${ok ? "OK  " : "FAIL"} ${b.property} ${ymd(b.service_start)}..${ymd(b.service_end)} ${b.provider} ${b.amount_cents}c rows=${after.length} sum=${sum}` +
          (okTs ? "" : " [SQL != TS]") + (okNoop ? "" : " [changed stored splits]") + (okSum ? "" : " [sum mismatch]")
      );
      if (!okTs || !okNoop) console.log("   before", key(before), "\n   after ", key(after), "\n   ts    ", key(ts));
    }
  } finally {
    await c.query("rollback");
    await c.end();
  }
  console.log(failures === 0 ? "All bills match (transaction rolled back)." : `${failures} bill(s) differ (transaction rolled back).`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
