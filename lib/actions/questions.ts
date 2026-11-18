"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification, notifyUser } from "@/lib/server/notifications";
import { updateBill } from "@/lib/actions/bills";
import { billQuestionEmail } from "@/lib/email/templates/bill-question";
import {
  askQuestionSchema,
  previewText,
  replyQuestionSchema,
  resolutionMessage,
  resolveQuestionSchema,
} from "@/lib/questions/helpers";
import { formatCents } from "@/lib/utils";
import type { BillCategory } from "@/lib/supabase/types";
import type { z } from "zod";

type Result = { ok: true; questionId: string } | { ok: false; error: string };

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const ownerThreadUrl = (questionId: string) => `/dashboard/owner/questions/${questionId}`;
const tenantThreadUrl = (propertyId: string, cycleId: string, billId: string) =>
  `/dashboard/tenant/properties/${propertyId}/bills/${cycleId}?question=${billId}`;

interface ThreadContext {
  id: string;
  bill_id: string;
  property_id: string;
  asked_by: string;
  status: "open" | "answered" | "resolved";
  bill: {
    id: string;
    cycle_id: string;
    category: BillCategory;
    provider: string;
    amount_cents: number;
    service_start: string;
    service_end: string;
    notes: string | null;
  };
  property: { name: string; owner_id: string };
}

/** Names for emails. Service role: a tenant can't always read the owner's profile under RLS. */
async function profileName(userId: string, fallback: string) {
  const { data } = await createAdminClient().from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return data?.full_name || fallback;
}

/**
 * Load a thread the signed-in user may see (RLS: asker, owner or admin) and decide their role in it.
 * Admins can read but are neither asker nor owner, so every write below rejects them.
 */
async function loadThread(questionId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const { data: q } = await supabase
    .from("bill_questions")
    .select("id, bill_id, property_id, asked_by, status")
    .eq("id", questionId)
    .maybeSingle();
  if (!q) return { ok: false as const, error: "Question not found" };

  const admin = createAdminClient();
  const [{ data: bill }, { data: property }] = await Promise.all([
    admin
      .from("bills")
      .select("id, cycle_id, category, provider, amount_cents, service_start, service_end, notes")
      .eq("id", q.bill_id)
      .maybeSingle(),
    admin.from("properties").select("name, owner_id, deleted_at").eq("id", q.property_id).maybeSingle(),
  ]);
  if (!bill || !property || property.deleted_at) return { ok: false as const, error: "Question not found" };

  const thread: ThreadContext = { ...q, bill, property: { name: property.name, owner_id: property.owner_id } };
  return {
    ok: true as const,
    supabase,
    user,
    thread,
    isAsker: q.asked_by === user.id,
    isOwner: property.owner_id === user.id,
  };
}

function revalidateThread(propertyId: string, cycleId: string) {
  revalidatePath("/dashboard/owner/questions", "layout");
  revalidatePath(`/dashboard/tenant/properties/${propertyId}/bills/${cycleId}`);
}

/** Tenant asks about a bill. Adds to their live thread on that bill if one exists. */
export async function askQuestion(input: z.input<typeof askQuestionSchema>): Promise<Result> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = askQuestionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  // RLS limits bills to ones this tenant can see (their stay overlaps the service period).
  const { data: bill } = await supabase
    .from("bills")
    .select("id, property_id, cycle_id, category, provider")
    .eq("id", parsed.data.billId)
    .maybeSingle();
  if (!bill) return { ok: false, error: "Bill not found" };

  const { data: tenantRecord } = await supabase
    .from("property_tenants")
    .select("id, display_name")
    .eq("property_id", bill.property_id)
    .eq("tenant_id", user.id)
    .in("status", ["active", "departed"])
    .maybeSingle();
  if (!tenantRecord) return { ok: false, error: "Only tenants of this property can ask about its bills" };

  const findLive = () =>
    supabase
      .from("bill_questions")
      .select("id")
      .eq("bill_id", bill.id)
      .eq("asked_by", user.id)
      .neq("status", "resolved")
      .maybeSingle();

  let { data: question } = await findLive();
  const isNew = !question;
  if (!question) {
    const ins = await supabase
      .from("bill_questions")
      .insert({ bill_id: bill.id, property_id: bill.property_id, tenant_id: tenantRecord.id, asked_by: user.id })
      .select("id")
      .single();
    if (ins.error?.code === "23505") question = (await findLive()).data;
    else if (ins.error) return { ok: false, error: "Couldn't start the question. Try again." };
    else question = ins.data;
  }
  if (!question) return { ok: false, error: "Couldn't start the question. Try again." };

  const { error: msgError } = await supabase
    .from("bill_question_messages")
    .insert({ question_id: question.id, property_id: bill.property_id, author_id: user.id, body: parsed.data.body });
  if (msgError) return { ok: false, error: "Couldn't send your message. Try again." };

  const { data: property } = await createAdminClient()
    .from("properties")
    .select("name, owner_id")
    .eq("id", bill.property_id)
    .maybeSingle();
  if (property) {
    const tenantName = tenantRecord.display_name || (await profileName(user.id, "A tenant"));
    const billLabel = `${bill.category} - ${bill.provider}`;
    await notifyUser({
      userId: property.owner_id,
      type: isNew ? "question_asked" : "question_reply",
      title: isNew ? `Question about ${billLabel}` : `New message about ${billLabel}`,
      body: `${tenantName}: ${previewText(parsed.data.body)}`,
      metadata: { questionId: question.id, billId: bill.id, propertyId: bill.property_id, cycleId: bill.cycle_id },
      email: billQuestionEmail({
        subject: `${isNew ? "Question" : "New message"} about the ${bill.category} bill - ${property.name}`,
        heading: isNew ? "A tenant asked about a bill" : "New message on a bill question",
        recipientName: await profileName(property.owner_id, "there"),
        intro: `${tenantName} wrote about the ${bill.category} bill from ${bill.provider} at ${property.name}:`,
        message: parsed.data.body,
        ctaLabel: "Reply",
        url: `${appUrl()}${ownerThreadUrl(question.id)}`,
      }),
    });
  }

  revalidateThread(bill.property_id, bill.cycle_id);
  return { ok: true, questionId: question.id };
}

/** Reply in a thread, as the asking tenant or the property owner. */
export async function replyToQuestion(input: z.input<typeof replyQuestionSchema>): Promise<Result> {
  const parsed = replyQuestionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const loaded = await loadThread(parsed.data.questionId);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const { supabase, user, thread, isAsker, isOwner } = loaded;
  if (!isAsker && !isOwner) return { ok: false, error: "Question not found" };
  if (thread.status === "resolved") {
    return { ok: false, error: "This question is resolved. Ask a new one if something still looks off." };
  }

  const { error } = await supabase
    .from("bill_question_messages")
    .insert({ question_id: thread.id, property_id: thread.property_id, author_id: user.id, body: parsed.data.body });
  if (error) return { ok: false, error: "Couldn't send your message. Try again." };

  const billLabel = `${thread.bill.category} - ${thread.bill.provider}`;
  const recipientId = isOwner ? thread.asked_by : thread.property.owner_id;
  const authorName = await profileName(user.id, isOwner ? "Your landlord" : "A tenant");
  const path = isOwner
    ? tenantThreadUrl(thread.property_id, thread.bill.cycle_id, thread.bill_id)
    : ownerThreadUrl(thread.id);
  await notifyUser({
    userId: recipientId,
    type: "question_reply",
    title: `New message about ${billLabel}`,
    body: `${authorName}: ${previewText(parsed.data.body)}`,
    metadata: {
      questionId: thread.id,
      billId: thread.bill_id,
      propertyId: thread.property_id,
      cycleId: thread.bill.cycle_id,
      forRole: isOwner ? "tenant" : "owner",
    },
    email: billQuestionEmail({
      subject: `New message about the ${thread.bill.category} bill - ${thread.property.name}`,
      heading: "New message on a bill question",
      recipientName: await profileName(recipientId, "there"),
      intro: `${authorName} wrote about the ${thread.bill.category} bill from ${thread.bill.provider} at ${thread.property.name}:`,
      message: parsed.data.body,
      ctaLabel: "View conversation",
      url: `${appUrl()}${path}`,
    }),
  });

  revalidateThread(thread.property_id, thread.bill.cycle_id);
  return { ok: true, questionId: thread.id };
}

/**
 * Owner closes a thread, optionally correcting the bill amount. The correction goes through
 * updateBill (ownership + closed-cycle checks, atomic re-split), so every share is recalculated.
 */
export async function resolveQuestion(input: z.input<typeof resolveQuestionSchema>): Promise<Result> {
  const parsed = resolveQuestionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const loaded = await loadThread(parsed.data.questionId);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const { supabase, user, thread, isOwner } = loaded;
  if (!isOwner) return { ok: false, error: "Only the landlord can resolve a question" };
  if (thread.status === "resolved") return { ok: false, error: "This question is already resolved" };

  const oldAmount = thread.bill.amount_cents;
  const newAmount = parsed.data.correctedAmountCents;
  const corrected = newAmount !== undefined && newAmount !== oldAmount;

  if (corrected) {
    const res = await updateBill(thread.bill.id, {
      category: thread.bill.category,
      provider: thread.bill.provider,
      amount_cents: newAmount,
      service_start: thread.bill.service_start,
      service_end: thread.bill.service_end,
      notes: thread.bill.notes,
    });
    if ("error" in res && res.error) return { ok: false, error: res.error };
  }

  const closing = resolutionMessage({
    note: parsed.data.note,
    oldAmountCents: oldAmount,
    newAmountCents: newAmount,
    formatCents,
  });
  if (closing) {
    const { error } = await supabase
      .from("bill_question_messages")
      .insert({ question_id: thread.id, property_id: thread.property_id, author_id: user.id, body: closing.slice(0, 2000) });
    if (error) return { ok: false, error: "Couldn't post the closing message. Try again." };
  }

  const { data: updated, error } = await supabase
    .from("bill_questions")
    .update({
      status: "resolved",
      resolution_note: parsed.data.note?.trim() || null,
      corrected_amount_cents: corrected ? newAmount : null,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", thread.id)
    .select("id");
  if (error || !updated?.length) return { ok: false, error: "Couldn't resolve the question. Try again." };

  const billLabel = `${thread.bill.category} - ${thread.bill.provider}`;
  await notifyUser({
    userId: thread.asked_by,
    type: "question_resolved",
    title: `Question resolved: ${billLabel}`,
    body: closing ? previewText(closing) : "Your landlord marked your question as resolved.",
    metadata: {
      questionId: thread.id,
      billId: thread.bill_id,
      propertyId: thread.property_id,
      cycleId: thread.bill.cycle_id,
    },
    email: billQuestionEmail({
      subject: `Your question about the ${thread.bill.category} bill is resolved - ${thread.property.name}`,
      heading: "Your question was resolved",
      recipientName: await profileName(thread.asked_by, "there"),
      intro: `Your landlord resolved your question about the ${thread.bill.category} bill from ${thread.bill.provider} at ${thread.property.name}.`,
      message: closing ?? "Marked as resolved.",
      ctaLabel: "View bill",
      url: `${appUrl()}${tenantThreadUrl(thread.property_id, thread.bill.cycle_id, thread.bill_id)}`,
    }),
  });

  if (corrected) {
    const { data: tenants } = await createAdminClient()
      .from("property_tenants")
      .select("tenant_id")
      .eq("property_id", thread.property_id)
      .eq("status", "active")
      .not("tenant_id", "is", null);
    for (const t of tenants ?? []) {
      if (t.tenant_id && t.tenant_id !== thread.asked_by) {
        await createNotification(
          t.tenant_id,
          "bill_adjusted",
          `Bill adjusted: ${billLabel}`,
          `The bill was corrected from ${formatCents(oldAmount)} to ${formatCents(newAmount!)}. Your share may have changed.`,
          { billId: thread.bill_id, propertyId: thread.property_id, cycleId: thread.bill.cycle_id }
        );
      }
    }
  }

  revalidateThread(thread.property_id, thread.bill.cycle_id);
  return { ok: true, questionId: thread.id };
}
