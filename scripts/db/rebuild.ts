/**
 * Wipe the linked Supabase project's app schema and rebuild it from supabase/migrations.
 * No Docker needed. DESTRUCTIVE — requires --yes. Back up first: npx tsx scripts/db/backup.ts <file>
 *
 * Drops: every table + function in `public`, the auth.users trigger, all auth users,
 * the fairsplit cron job, and CLI migration history. Then applies each migration in order
 * (one transaction per file) and records it in supabase_migrations.schema_migrations so
 * `supabase migration list --remote` stays accurate.
 */
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { connect } from "./_conn";

(async () => {
  if (!process.argv.includes("--yes")) {
    console.error("Refusing to run without --yes (this wipes the database).");
    process.exit(1);
  }
  const c = await connect();
  console.log("Wiping…");
  await c.query("begin");
  await c.query("drop trigger if exists on_auth_user_created on auth.users");
  const { rows: tables } = await c.query(
    "select tablename from pg_tables where schemaname='public'");
  for (const { tablename } of tables) await c.query(`drop table if exists public."${tablename}" cascade`);
  const { rows: fns } = await c.query(`
    select p.oid::regprocedure::text sig from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    left join pg_depend d on d.objid = p.oid and d.deptype = 'e'
    where n.nspname = 'public' and d.objid is null`);
  for (const { sig } of fns) await c.query(`drop function if exists ${sig} cascade`);
  await c.query("delete from auth.users");
  await c.query("create schema if not exists supabase_migrations");
  await c.query(`create table if not exists supabase_migrations.schema_migrations
    (version text primary key, statements text[], name text)`);
  await c.query("delete from supabase_migrations.schema_migrations");
  await c.query("commit");
  try {
    await c.query("select cron.unschedule('fairsplit-nightly')");
  } catch { /* cron not installed or job missing */ }
  try {
    await c.query("delete from storage.buckets where id='bill-pdfs' and not exists (select 1 from storage.objects where bucket_id='bill-pdfs')");
  } catch (e) { console.warn("bucket cleanup skipped:", (e as Error).message); }

  const dir = path.resolve(__dirname, "../../supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(path.join(dir, file), "utf8");
    const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
    process.stdout.write(`Applying ${file}… `);
    await c.query("begin");
    try {
      await c.query(sql);
      await c.query(
        "insert into supabase_migrations.schema_migrations(version, statements, name) values ($1, $2, $3)",
        [version, [sql], rest.join("_")]);
      await c.query("commit");
      console.log("ok");
    } catch (e) {
      await c.query("rollback");
      console.log("FAILED");
      throw e;
    }
  }
  await c.end();
  console.log("Rebuild complete.");
})().catch((e) => { console.error(e.message ?? e); process.exit(1); });
