import "server-only";

import { createClient } from "@/lib/supabase/server";
import { sortQuestionsForInbox } from "@/lib/questions/helpers";
import type { BillQuestionStatus } from "@/lib/supabase/types";

export interface OwnerQuestionRow {
  id: string;
  status: BillQuestionStatus;
  created_at: string;
  updated_at: string;
  propertyId: string;
  propertyName: string;
  tenantName: string;
  bill: { id: string; category: string; provider: string; amount_cents: number; cycle_id: string };
  lastMessage: { body: string; fromTenant: boolean; created_at: string } | null;
  messageCount: number;
}

/** Bill questions on the signed-in owner's properties, inbox-ordered. */
export async function getOwnerQuestions(opts: { show: "unresolved" | "resolved"; propertyId?: string }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { properties: [], rows: [] as OwnerQuestionRow[] };

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("name");
  const ownedIds = (properties ?? []).map((p) => p.id);
  const scopeIds = opts.propertyId ? ownedIds.filter((id) => id === opts.propertyId) : ownedIds;
  if (scopeIds.length === 0) return { properties: properties ?? [], rows: [] };

  let query = supabase
    .from("bill_questions")
    .select("id, status, created_at, updated_at, property_id, asked_by, tenant_id, bill_id")
    .in("property_id", scopeIds)
    .order("updated_at", { ascending: false })
    .limit(200);
  query = opts.show === "resolved" ? query.eq("status", "resolved") : query.neq("status", "resolved");
  const { data: questions } = await query;
  if (!questions?.length) return { properties: properties ?? [], rows: [] };

  const [{ data: bills }, { data: tenants }, { data: messages }] = await Promise.all([
    supabase
      .from("bills")
      .select("id, category, provider, amount_cents, cycle_id")
      .in("id", Array.from(new Set(questions.map((q) => q.bill_id)))),
    supabase
      .from("property_tenants")
      .select("id, display_name")
      .in("id", Array.from(new Set(questions.map((q) => q.tenant_id)))),
    supabase
      .from("bill_question_messages")
      .select("question_id, author_id, body, created_at")
      .in("question_id", questions.map((q) => q.id))
      .order("created_at", { ascending: false }),
  ]);

  const billMap = new Map((bills ?? []).map((b) => [b.id, b]));
  const tenantMap = new Map((tenants ?? []).map((t) => [t.id, t.display_name]));
  const propertyMap = new Map((properties ?? []).map((p) => [p.id, p.name]));

  const rows: OwnerQuestionRow[] = [];
  for (const q of questions) {
    const bill = billMap.get(q.bill_id);
    if (!bill) continue;
    const msgs = (messages ?? []).filter((m) => m.question_id === q.id);
    const last = msgs[0];
    rows.push({
      id: q.id,
      status: q.status,
      created_at: q.created_at,
      updated_at: last?.created_at && last.created_at > q.updated_at ? last.created_at : q.updated_at,
      propertyId: q.property_id,
      propertyName: propertyMap.get(q.property_id) ?? "Property",
      tenantName: tenantMap.get(q.tenant_id) || "Tenant",
      bill,
      lastMessage: last ? { body: last.body, fromTenant: last.author_id === q.asked_by, created_at: last.created_at } : null,
      messageCount: msgs.length,
    });
  }
  return { properties: properties ?? [], rows: sortQuestionsForInbox(rows) };
}
