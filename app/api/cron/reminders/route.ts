import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { runOwnerDigests, runTenantReminders } from "@/lib/server/cycle-emails";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Daily (Vercel Cron, see vercel.json): due-soon + overdue reminders to tenants and a digest of
 * payments awaiting confirmation to owners. Idempotent: re-running the same day sends nothing new.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  try {
    const reminders = await runTenantReminders(now);
    const digests = await runOwnerDigests(now);
    return NextResponse.json({ ok: true, ranAt: now.toISOString(), reminders, digests });
  } catch (err) {
    console.error("[cron/reminders]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
