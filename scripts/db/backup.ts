/** Export every row of public + auth.users to JSON (no Docker needed). Usage: npx tsx scripts/db/backup.ts <outfile> */
import { writeFileSync } from "fs";
import { connect } from "./_conn";

(async () => {
  const out = process.argv[2] ?? "backup.json";
  const c = await connect();
  const { rows: tables } = await c.query(
    "select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1");
  const dump: Record<string, unknown[]> = {};
  for (const { table_name } of tables) dump[`public.${table_name}`] = (await c.query(`select * from public."${table_name}"`)).rows;
  dump["auth.users"] = (await c.query("select id,email,created_at,raw_user_meta_data from auth.users")).rows;
  const { rows: fns } = await c.query(
    "select p.proname, pg_get_functiondef(p.oid) def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'");
  dump["_functions"] = fns;
  const { rows: pols } = await c.query("select * from pg_policies where schemaname='public'");
  dump["_policies"] = pols;
  writeFileSync(out, JSON.stringify(dump, null, 2));
  console.log(Object.entries(dump).map(([k, v]) => `${k}: ${v.length}`).join("\n"));
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
