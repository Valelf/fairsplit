import { describe, expect, it } from "vitest";
import {
  askQuestionSchema,
  previewText,
  questionStatusLabel,
  resolutionMessage,
  resolveQuestionSchema,
  sortQuestionsForInbox,
  statusAfterMessage,
} from "./helpers";

const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
const uuid = "6f1c1f5e-2b7a-4c1e-9a7e-2d0f1b8a9c11";

describe("statusAfterMessage", () => {
  it("asker reopens, owner answers, resolved stays resolved", () => {
    expect(statusAfterMessage("answered", true)).toBe("open");
    expect(statusAfterMessage("open", false)).toBe("answered");
    expect(statusAfterMessage("resolved", true)).toBe("resolved");
  });
});

describe("questionStatusLabel", () => {
  it("words status for each viewer", () => {
    expect(questionStatusLabel("open", "owner")).toBe("Needs reply");
    expect(questionStatusLabel("answered", "owner")).toBe("Waiting on tenant");
    expect(questionStatusLabel("open", "tenant")).toBe("Waiting on landlord");
    expect(questionStatusLabel("answered", "tenant")).toBe("Landlord replied");
    expect(questionStatusLabel("resolved", "tenant")).toBe("Resolved");
  });
});

describe("sortQuestionsForInbox", () => {
  it("puts open first, then answered, then resolved, newest first", () => {
    const rows = [
      { id: "a", status: "answered" as const, updated_at: "2026-11-02T00:00:00Z" },
      { id: "b", status: "open" as const, updated_at: "2026-11-01T00:00:00Z" },
      { id: "c", status: "resolved" as const, updated_at: "2026-11-05T00:00:00Z" },
      { id: "d", status: "open" as const, updated_at: "2026-11-03T00:00:00Z" },
    ];
    expect(sortQuestionsForInbox(rows).map((r) => r.id)).toEqual(["d", "b", "a", "c"]);
  });
});

describe("previewText", () => {
  it("flattens whitespace and truncates", () => {
    expect(previewText("hi\n\n there")).toBe("hi there");
    expect(previewText("x".repeat(20), 10)).toBe(`${"x".repeat(9)}…`);
  });
});

describe("schemas", () => {
  it("rejects blank and over-long bodies", () => {
    expect(askQuestionSchema.safeParse({ billId: uuid, body: "   " }).success).toBe(false);
    expect(askQuestionSchema.safeParse({ billId: uuid, body: "x".repeat(2001) }).success).toBe(false);
    expect(askQuestionSchema.safeParse({ billId: uuid, body: " why so high? " }).data?.body).toBe("why so high?");
  });
  it("rejects bad ids and non-positive corrections", () => {
    expect(askQuestionSchema.safeParse({ billId: "nope", body: "x" }).success).toBe(false);
    expect(resolveQuestionSchema.safeParse({ questionId: uuid, correctedAmountCents: 0 }).success).toBe(false);
    expect(resolveQuestionSchema.safeParse({ questionId: uuid, correctedAmountCents: 1.5 }).success).toBe(false);
    expect(resolveQuestionSchema.safeParse({ questionId: uuid }).success).toBe(true);
  });
});

describe("resolutionMessage", () => {
  it("describes a correction and appends the note", () => {
    expect(
      resolutionMessage({ note: "Typo on my side.", oldAmountCents: 12000, newAmountCents: 10250, formatCents: fmt })
    ).toBe("Corrected the bill from $120.00 to $102.50. Everyone's shares were recalculated.\n\nTypo on my side.");
  });
  it("ignores an unchanged amount and returns null when empty", () => {
    expect(resolutionMessage({ oldAmountCents: 100, newAmountCents: 100, formatCents: fmt })).toBeNull();
    expect(resolutionMessage({ note: "  ", formatCents: fmt })).toBeNull();
  });
});
