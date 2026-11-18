import { Client } from "pg";
import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const ref = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(/https:\/\/([^.]+)\./)?.[1];
const pw = process.env.SUPABASE_DB_PASSWORD;

/** Connect to the linked Supabase Postgres via the session pooler (IPv4). */
export async function connect(): Promise<Client> {
  if (!ref || !pw) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_DB_PASSWORD");
  const hosts = process.env.SUPABASE_DB_HOST
    ? [process.env.SUPABASE_DB_HOST]
    : ["aws-0-us-east-1.pooler.supabase.com", "aws-1-us-east-1.pooler.supabase.com"];
  let lastErr: unknown;
  for (const host of hosts) {
    const c = new Client({ host, port: 5432, user: `postgres.${ref}`, password: pw, database: "postgres", ssl: { rejectUnauthorized: false } });
    try { await c.connect(); return c; } catch (e) { lastErr = e; }
  }
  throw lastErr;
}
