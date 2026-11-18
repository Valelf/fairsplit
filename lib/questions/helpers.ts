import { z } from "zod";
import type { BillQuestionStatus } from "@/lib/supabase/types";

export const QUESTION_BODY_MAX = 2000;

/** A message body: trimmed, 1..2000 characters. */
export const questionBodySchema = z
  .string()
  .trim()
  .min(1, "Write your question first")
  .max(QUESTION_BODY_MAX, `Keep it under ${QUESTION_BODY_MAX} characters`);

export const askQuestionSchema = z.object({
  billId: z.string().uuid(),
  body: questionBodySchema,
});

export const replyQuestionSchema = z.object({
  questionId: z.string().uuid(),
  body: questionBodySchema,
});

export const resolveQuestionSchema = z.object({
  questionId: z.string().uuid(),
  note: z.string().trim().max(QUESTION_BODY_MAX).optional(),
  correctedAmountCents: z.number().int().positive("Amount must be positive").max(100_000_000).optional(),
});

/** Status after a new message: the asker speaking reopens it, the owner speaking answers it. */
export function statusAfterMessage(
  current: BillQuestionStatus,
  authorIsAsker: boolean
): BillQuestionStatus {
  if (current === "resolved") return "resolved";
  return authorIsAsker ? "open" : "answered";
}

/** Short label for a thread's status, worded for whoever is looking at it. */
export function questionStatusLabel(status: BillQuestionStatus, viewer: "owner" | "tenant"): string {
  if (status === "resolved") return "Resolved";
  if (viewer === "owner") return status === "open" ? "Needs reply" : "Waiting on tenant";
  return status === "open" ? "Waiting on landlord" : "Landlord replied";
}

const STATUS_RANK: Record<BillQuestionStatus, number> = { open: 0, answered: 1, resolved: 2 };

/** Inbox order: needs-reply first, then waiting, then resolved; newest activity first within each. */
export function sortQuestionsForInbox<T extends { status: BillQuestionStatus; updated_at: string }>(
  rows: readonly T[]
): T[] {
  return [...rows].sort(
    (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.updated_at.localeCompare(a.updated_at)
  );
}

/** One-line preview of a message for lists and notifications. */
export function previewText(body: string, max = 140): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

/** Text of the closing message posted when the owner resolves, or null if there is nothing to say. */
export function resolutionMessage(params: {
  note?: string;
  oldAmountCents?: number;
  newAmountCents?: number;
  formatCents: (cents: number) => string;
}): string | null {
  const parts: string[] = [];
  if (
    params.newAmountCents !== undefined &&
    params.oldAmountCents !== undefined &&
    params.newAmountCents !== params.oldAmountCents
  ) {
    parts.push(
      `Corrected the bill from ${params.formatCents(params.oldAmountCents)} to ${params.formatCents(params.newAmountCents)}. Everyone's shares were recalculated.`
    );
  }
  const note = params.note?.trim();
  if (note) parts.push(note);
  return parts.length ? parts.join("\n\n") : null;
}
