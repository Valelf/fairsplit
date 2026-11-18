/**
 * Live RLS check for bill_questions / bill_question_messages: tenant A asks about a bill,
 * tenant B can't read or post to A's thread, the owner can read/reply/resolve, tenants can't
 * change status, a resolved thread is closed to new messages, anon sees nothing.
 * Creates throwaway rows and deletes them afterwards.
 * Usage: npx tsx scripts/db/questions-check.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const pw = process.env.SEED_DEMO_PASSWORD!;
const OWNER_EMAIL = "shekar@example.com";
let failures = 0;
const check = (n: string, ok: boolean, d = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? `  (${d})` : ""}`);
  if (!ok) failures++;
};

async function signIn(email: string) {
  const c = createClient(url, anon, { auth: { persistSession: false } });
  const r = await c.auth.signInWithPassword({ email, password: pw });
  if (r.error) throw new Error(`sign-in failed for ${email}: ${r.error.message}`);
  return { c, id: r.data.user!.id };
}

(async () => {
  const { data: owner } = await service.from("profiles").select("id").eq("email", OWNER_EMAIL).single();
  const { data: property } = await service
    .from("properties")
    .select("id")
    .eq("owner_id", owner!.id)
    .ilike("name", "%575 McKinney%")
    .is("deleted_at", null)
    .single();
  const propertyId = property!.id as string;
  const { data: tenants } = await service
    .from("property_tenants")
    .select("id, email, tenant_id")
    .eq("property_id", propertyId)
    .eq("status", "active")
    .not("tenant_id", "is", null)
    .limit(2);
  if (!tenants || tenants.length < 2) throw new Error("need two claimed active tenants on 575 McKinney");
  const [ta, tb] = tenants;

  const A = await signIn(ta.email);
  const B = await signIn(tb.email);
  const O = await signIn(OWNER_EMAIL);

  // A bill tenant A can see.
  const { data: bills } = await A.c.from("bills").select("id").eq("property_id", propertyId).limit(1);
  const billId = bills?.[0]?.id as string | undefined;
  if (!billId) throw new Error("tenant A can't see any bill on 575 McKinney");

  const createdQuestions: string[] = [];
  try {
    // Tenant A can't ask as tenant B.
    const spoof = await A.c
      .from("bill_questions")
      .insert({ bill_id: billId, property_id: propertyId, tenant_id: tb.id, asked_by: B.id })
      .select("id");
    check("tenant cannot ask as someone else", !!spoof.error || (spoof.data?.length ?? 0) === 0, spoof.error?.code);
    for (const r of spoof.data ?? []) createdQuestions.push(r.id);

    const q = await A.c
      .from("bill_questions")
      .insert({ bill_id: billId, property_id: propertyId, tenant_id: ta.id, asked_by: A.id })
      .select("id, status")
      .single();
    check("tenant A can ask", !q.error && q.data?.status === "open", q.error?.message);
    if (!q.data) throw new Error("cannot continue without a question");
    const qid = q.data.id as string;
    createdQuestions.push(qid);

    const m = await A.c
      .from("bill_question_messages")
      .insert({ question_id: qid, property_id: propertyId, author_id: A.id, body: "RLS probe: why so high?" })
      .select("id")
      .single();
    check("tenant A can post to own thread", !m.error, m.error?.message);

    const longMsg = await A.c
      .from("bill_question_messages")
      .insert({ question_id: qid, property_id: propertyId, author_id: A.id, body: "x".repeat(2001) })
      .select("id");
    check("body over 2000 chars rejected", !!longMsg.error, longMsg.error?.code);

    // Tenant B: can't read or post.
    const bq = await B.c.from("bill_questions").select("id").eq("id", qid);
    check("tenant B cannot read A's question", (bq.data?.length ?? 0) === 0, bq.error?.message);
    const bm = await B.c.from("bill_question_messages").select("id").eq("question_id", qid);
    check("tenant B cannot read A's messages", (bm.data?.length ?? 0) === 0, bm.error?.message);
    const bpost = await B.c
      .from("bill_question_messages")
      .insert({ question_id: qid, property_id: propertyId, author_id: B.id, body: "RLS probe intrusion" })
      .select("id");
    check("tenant B cannot post to A's thread", !!bpost.error || (bpost.data?.length ?? 0) === 0, bpost.error?.code);

    // Owner: can read and reply; reply flips status to answered.
    const oq = await O.c.from("bill_questions").select("id").eq("id", qid);
    check("owner can read the question", (oq.data?.length ?? 0) === 1, oq.error?.message);
    const om = await O.c.from("bill_question_messages").select("id").eq("question_id", qid);
    check("owner can read the messages", (om.data?.length ?? 0) === 1, om.error?.message);
    const oreply = await O.c
      .from("bill_question_messages")
      .insert({ question_id: qid, property_id: propertyId, author_id: O.id, body: "RLS probe: checked, it's right." })
      .select("id")
      .single();
    check("owner can reply", !oreply.error, oreply.error?.message);
    const afterReply = await service.from("bill_questions").select("status").eq("id", qid).single();
    check("owner reply sets status answered", afterReply.data?.status === "answered", afterReply.data?.status);

    // Tenants can't update or delete.
    const tUpd = await A.c.from("bill_questions").update({ status: "resolved" }).eq("id", qid).select("id");
    check("tenant cannot change status", !!tUpd.error || (tUpd.data?.length ?? 0) === 0, tUpd.error?.code);
    const tDel = await A.c.from("bill_question_messages").delete().eq("question_id", qid).select("id");
    check("tenant cannot delete messages", !!tDel.error || (tDel.data?.length ?? 0) === 0, tDel.error?.code);
    const oDel = await O.c.from("bill_questions").delete().eq("id", qid).select("id");
    check("owner cannot delete questions", !!oDel.error || (oDel.data?.length ?? 0) === 0, oDel.error?.code);

    // Owner resolves; then the thread is closed.
    const res = await O.c
      .from("bill_questions")
      .update({ status: "resolved", resolved_by: O.id, resolved_at: new Date().toISOString(), resolution_note: "probe" })
      .eq("id", qid)
      .select("id");
    check("owner can resolve", !res.error && (res.data?.length ?? 0) === 1, res.error?.message);
    const late = await A.c
      .from("bill_question_messages")
      .insert({ question_id: qid, property_id: propertyId, author_id: A.id, body: "RLS probe late" })
      .select("id");
    check("resolved thread rejects new messages", !!late.error || (late.data?.length ?? 0) === 0, late.error?.code);
    const reopen = await O.c.from("bill_questions").update({ status: "open" }).eq("id", qid).select("id");
    check("resolved thread can't be reopened via update", !!reopen.error || (reopen.data?.length ?? 0) === 0, reopen.error?.code);

    // Anon sees nothing.
    const a = createClient(url, anon, { auth: { persistSession: false } });
    const aq = await a.from("bill_questions").select("id");
    check("anon cannot read questions", (aq.data?.length ?? 0) === 0, aq.error?.code);
    const am = await a.from("bill_question_messages").select("id");
    check("anon cannot read messages", (am.data?.length ?? 0) === 0, am.error?.code);
  } finally {
    if (createdQuestions.length) await service.from("bill_questions").delete().in("id", createdQuestions);
    const { data: left } = await service.from("bill_question_messages").select("id").ilike("body", "RLS probe%");
    const { data: leftQ } = await service.from("bill_questions").select("id").in("id", createdQuestions.length ? createdQuestions : ["00000000-0000-0000-0000-000000000000"]);
    check("cleanup: probe rows removed", (left?.length ?? 0) === 0 && (leftQ?.length ?? 0) === 0);
  }
  console.log(failures ? `${failures} FAILED` : "ALL PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
