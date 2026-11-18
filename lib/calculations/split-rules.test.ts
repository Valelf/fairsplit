import { describe, expect, it } from "vitest";
import { calculateBillSplitCents, type TenantPeriod } from "./person-days";

const mckinney: TenantPeriod[] = [
  { tenantId: "anil", joinDate: "2025-01-01", leaveDate: "2025-10-30" },
  { tenantId: "navya", joinDate: "2025-10-01", leaveDate: null },
  { tenantId: "vineesh", joinDate: "2025-10-01", leaveDate: null },
  { tenantId: "val", joinDate: "2025-10-11", leaveDate: null },
  { tenantId: "divya", joinDate: "2025-11-10", leaveDate: null },
];
const octNov = { amountCents: 22000, serviceStart: "2025-10-14", serviceEnd: "2025-11-12" };

const byId = (rows: ReturnType<typeof calculateBillSplitCents>) =>
  Object.fromEntries(rows.map((r) => [r.tenantId, r]));
const sum = (rows: ReturnType<typeof calculateBillSplitCents>) => rows.reduce((s, r) => s + r.amountCents, 0);

describe("split rules: equal_present", () => {
  it("splits equally among everyone with at least one day, whatever their days", () => {
    const rows = calculateBillSplitCents(octNov, mckinney, { method: "equal_present" });
    const r = byId(rows);
    for (const id of ["anil", "navya", "vineesh", "val", "divya"]) {
      expect(r[id].amountCents).toBe(4400);
      expect(r[id].shareCount).toBe(5);
    }
    // real days are still reported
    expect(r.divya.personDays).toBe(3);
    expect(r.navya.totalPersonDays).toBe(110);
    expect(sum(rows)).toBe(22000);
  });

  it("ignores tenants with 0 days in the period", () => {
    const rows = calculateBillSplitCents(
      { amountCents: 9000, serviceStart: "2025-09-01", serviceEnd: "2025-09-30" },
      mckinney,
      { method: "equal_present" }
    );
    const r = byId(rows);
    expect(r.anil).toMatchObject({ amountCents: 9000, shareCount: 1 });
    expect(r.navya).toMatchObject({ personDays: 0, amountCents: 0 });
    expect(r.navya.shareCount).toBeUndefined();
  });

  it("rounds with largest remainder: ties go to more days, then input order; exact total", () => {
    const three: TenantPeriod[] = [
      { tenantId: "a", joinDate: "2025-10-20", leaveDate: null }, // fewer days
      { tenantId: "b", joinDate: "2025-10-01", leaveDate: null },
      { tenantId: "c", joinDate: "2025-10-01", leaveDate: null },
    ];
    const rows = calculateBillSplitCents(
      { amountCents: 10001, serviceStart: "2025-10-01", serviceEnd: "2025-10-31" },
      three,
      { method: "equal_present" }
    );
    const r = byId(rows);
    // 10001 = 3 * 3333 + 2 → b and c (more days) get the extra cents, a does not
    expect(r.a.amountCents).toBe(3333);
    expect(r.b.amountCents).toBe(3334);
    expect(r.c.amountCents).toBe(3334);
    expect(sum(rows)).toBe(10001);
  });

  it("sums exactly for many amounts and household sizes", () => {
    for (let amount = 0; amount < 400; amount += 7) {
      for (let n = 1; n <= 6; n++) {
        const ts = mckinney.slice(0, n);
        const rows = calculateBillSplitCents(
          { amountCents: amount, serviceStart: "2025-10-01", serviceEnd: "2025-11-30" },
          ts,
          { method: "equal_present" }
        );
        expect(sum(rows)).toBe(amount);
        const shares = rows.filter((x) => x.personDays > 0).map((x) => x.amountCents);
        expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("split rules: exclusions", () => {
  it("default options give exactly the old result", () => {
    expect(calculateBillSplitCents(octNov, mckinney, {})).toEqual(calculateBillSplitCents(octNov, mckinney));
    expect(calculateBillSplitCents(octNov, mckinney, { method: "person_days", excludedTenantIds: [] })).toEqual(
      calculateBillSplitCents(octNov, mckinney)
    );
  });

  it("person_days: excluded tenant pays nothing and others split by their days", () => {
    const rows = calculateBillSplitCents(octNov, mckinney, { excludedTenantIds: ["anil"] });
    const r = byId(rows);
    expect(r.anil).toMatchObject({ personDays: 0, amountCents: 0 });
    // 93 remaining person-days: 30/30/30/3
    expect(r.navya).toMatchObject({ personDays: 30, totalPersonDays: 93 });
    expect(sum(rows)).toBe(22000);
    // 22000*30/93 = 7096.77 (remainder 72/93) beats 22000*3/93 = 709.68 (63/93) for the 3 leftover cents
    expect(r.navya.amountCents).toBe(7097);
    expect(r.vineesh.amountCents).toBe(7097);
    expect(r.val.amountCents).toBe(7097);
    expect(r.divya.amountCents).toBe(709);
  });

  it("equal_present with an exclusion splits among the rest", () => {
    const rows = calculateBillSplitCents(octNov, mckinney, {
      method: "equal_present",
      excludedTenantIds: new Set(["divya"]),
    });
    const r = byId(rows);
    expect(r.divya).toMatchObject({ personDays: 0, amountCents: 0 });
    expect(r.navya).toMatchObject({ amountCents: 5500, shareCount: 4, totalPersonDays: 107 });
    expect(sum(rows)).toBe(22000);
  });

  it("everyone excluded → no one has days and nothing is allocated (zero rows after filtering)", () => {
    for (const method of ["person_days", "equal_present"] as const) {
      const rows = calculateBillSplitCents(octNov, mckinney, {
        method,
        excludedTenantIds: mckinney.map((t) => t.tenantId),
      });
      expect(rows.filter((x) => x.personDays > 0)).toHaveLength(0);
      expect(sum(rows)).toBe(0);
    }
  });

  it("unknown excluded ids are ignored", () => {
    expect(calculateBillSplitCents(octNov, mckinney, { excludedTenantIds: ["nobody"] })).toEqual(
      calculateBillSplitCents(octNov, mckinney)
    );
  });
});
