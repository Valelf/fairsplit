import { describe, expect, it } from "vitest";
import {
  daysBetween,
  describeShareMath,
  groupOwedByTenantCycle,
  planReminders,
  reminderKindFor,
  selectDigestItems,
  toUTCDateString,
  type ReminderCandidate,
} from "./schedule";

const base: ReminderCandidate = {
  cycleId: "c1",
  propertyTenantId: "t1",
  cycleStatus: "open",
  dueDate: "2026-12-10",
  owedCents: 4200,
  alreadySent: [],
  remindersEnabled: true,
  hasEmail: true,
};

describe("daysBetween", () => {
  it("counts whole UTC days", () => {
    expect(daysBetween("2026-12-07", "2026-12-10")).toBe(3);
    expect(daysBetween("2026-12-10", "2026-12-10")).toBe(0);
    expect(daysBetween("2026-12-11", "2026-12-10")).toBe(-1);
    expect(daysBetween("2026-02-27", "2026-03-01")).toBe(2);
  });

  it("formats dates in UTC", () => {
    expect(toUTCDateString(new Date("2026-12-07T23:30:00-06:00"))).toBe("2026-12-08");
  });
});

describe("reminderKindFor", () => {
  it("sends nothing more than 3 days out", () => {
    expect(reminderKindFor("2026-12-06", base)).toBeNull();
  });

  it("sends due_soon from 3 days before through the due date", () => {
    expect(reminderKindFor("2026-12-07", base)).toBe("due_soon");
    expect(reminderKindFor("2026-12-09", base)).toBe("due_soon");
    expect(reminderKindFor("2026-12-10", base)).toBe("due_soon");
  });

  it("sends due_soon only once", () => {
    expect(reminderKindFor("2026-12-08", { ...base, alreadySent: ["due_soon"] })).toBeNull();
  });

  it("sends overdue the day after the due date, once", () => {
    expect(reminderKindFor("2026-12-11", base)).toBe("overdue");
    expect(reminderKindFor("2026-12-11", { ...base, alreadySent: ["due_soon"] })).toBe("overdue");
    expect(reminderKindFor("2026-12-20", { ...base, alreadySent: ["due_soon", "overdue"] })).toBeNull();
  });

  it("skips tenants who owe nothing (marked paid or confirmed)", () => {
    expect(reminderKindFor("2026-12-08", { ...base, owedCents: 0 })).toBeNull();
    expect(reminderKindFor("2026-12-12", { ...base, owedCents: 0 })).toBeNull();
  });

  it("skips draft cycles, cycles without a due date, opted-out tenants and missing emails", () => {
    expect(reminderKindFor("2026-12-08", { ...base, cycleStatus: "draft" })).toBeNull();
    expect(reminderKindFor("2026-12-08", { ...base, dueDate: null })).toBeNull();
    expect(reminderKindFor("2026-12-08", { ...base, remindersEnabled: false })).toBeNull();
    expect(reminderKindFor("2026-12-12", { ...base, hasEmail: false })).toBeNull();
  });

  it("still chases closed cycles that are unpaid", () => {
    expect(reminderKindFor("2026-12-12", { ...base, cycleStatus: "closed" })).toBe("overdue");
  });
});

describe("planReminders", () => {
  it("picks the right reminder per tenant on a given day", () => {
    const plan = planReminders("2026-12-11", [
      { ...base, propertyTenantId: "navya" }, // overdue
      { ...base, propertyTenantId: "val", owedCents: 0 }, // paid
      { ...base, propertyTenantId: "divya", cycleId: "c2", dueDate: "2026-12-13" }, // due soon
      { ...base, propertyTenantId: "anil", alreadySent: ["overdue"] }, // already chased
    ]);
    expect(plan.map((p) => [p.candidate.propertyTenantId, p.kind])).toEqual([
      ["navya", "overdue"],
      ["divya", "due_soon"],
    ]);
  });
});

describe("groupOwedByTenantCycle", () => {
  it("sums only owed splits per tenant and cycle", () => {
    const map = groupOwedByTenantCycle([
      { cycleId: "c1", propertyTenantId: "t1", amountCents: 1000, paymentStatus: "owed" },
      { cycleId: "c1", propertyTenantId: "t1", amountCents: 500, paymentStatus: "owed" },
      { cycleId: "c1", propertyTenantId: "t1", amountCents: 700, paymentStatus: "marked_paid" },
      { cycleId: "c1", propertyTenantId: "t2", amountCents: 900, paymentStatus: "confirmed" },
    ]);
    expect(map.get("c1:t1")?.owedCents).toBe(1500);
    expect(map.get("c1:t2")?.owedCents).toBe(0);
  });
});

describe("selectDigestItems", () => {
  const now = new Date("2026-12-11T14:00:00Z");
  const splits = [
    { id: "a", ownerId: "o", paymentStatus: "marked_paid", markedPaidAt: "2026-12-11T09:00:00Z" },
    { id: "b", ownerId: "o", paymentStatus: "marked_paid", markedPaidAt: "2026-12-09T09:00:00Z" },
    { id: "c", ownerId: "o", paymentStatus: "confirmed", markedPaidAt: "2026-12-11T10:00:00Z" },
    { id: "d", ownerId: "o", paymentStatus: "marked_paid", markedPaidAt: null },
  ];

  it("defaults to the last 24 hours when there is no previous digest", () => {
    expect(selectDigestItems(splits, null, now).map((s) => s.id)).toEqual(["a"]);
  });

  it("includes everything newly marked since the last digest", () => {
    expect(selectDigestItems(splits, "2026-12-08T14:00:00Z", now).map((s) => s.id)).toEqual(["a", "b"]);
    expect(selectDigestItems(splits, "2026-12-11T09:30:00Z", now)).toEqual([]);
  });
});

describe("describeShareMath", () => {
  it("shows bill amount × person-days / total", () => {
    const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
    expect(
      describeShareMath(
        { category: "electricity", provider: "Oncor", billAmountCents: 12000, personDays: 30, totalPersonDays: 100, shareCents: 3600 },
        fmt
      )
    ).toBe("$120.00 × 30 / 100 person-days");
  });
});
