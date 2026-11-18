/**
 * Apply pending migrations only (safe, non-destructive). Each file runs in its own transaction
 * and is recorded in supabase_migrations.schema_migrations. Usage: npm run db:migrate
 */
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { connect } from "./_conn";

(async () => {
  const c = await connect();
  await c.query("create schema if not exists supabase_migrations");
  await c.query(`create table if not exists supabase_migrations.schema_migrations
    (version text primary key, statements text[], name text)`);
  // Serialize concurrent runs.
  await c.query("select pg_advisory_lock(hashtext('fairsplit-migrate'))");
  const applied = new Set(
    (await c.query("select version from supabase_migrations.schema_migrations")).rows.map((r) => r.version)
  );
  const dir = path.resolve(__dirname, "../../supabase/migrations");
  const pending = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()
    .filter((f) => !applied.has(f.split("_")[0]));
  if (pending.length === 0) console.log("No pending migrations.");
  for (const file of pending) {
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
  await c.query("select pg_advisory_unlock(hashtext('fairsplit-migrate'))");
  await c.end();
})().catch((e) => { console.error(e.message ?? e); process.exit(1); });
