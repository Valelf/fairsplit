import { describe, expect, it } from "vitest";
import { calculateBillSplitCents, type TenantPeriod } from "./person-days";

// 575 McKinney household (context/seed-data/575-mckinney-property-data.md)
const mckinney: TenantPeriod[] = [
  { tenantId: "anil", joinDate: "2025-01-01", leaveDate: "2025-10-30" },
  { tenantId: "navya", joinDate: "2025-10-01", leaveDate: null },
  { tenantId: "vineesh", joinDate: "2025-10-01", leaveDate: null },
  { tenantId: "val", joinDate: "2025-10-11", leaveDate: null },
  { tenantId: "divya", joinDate: "2025-11-10", leaveDate: null },
];

const byId = (rows: ReturnType<typeof calculateBillSplitCents>) =>
  Object.fromEntries(rows.map((r) => [r.tenantId, r]));

describe("calculateBillSplitCents", () => {
  it("Oct–Nov electricity: 110 person-days at exactly $2.00/day (fixes the old $6 gap)", () => {
    const r = byId(
      calculateBillSplitCents({ amountCents: 22000, serviceStart: "2025-10-14", serviceEnd: "2025-11-12" }, mckinney)
    );
    expect(r.navya).toMatchObject({ personDays: 30, amountCents: 6000, totalPersonDays: 110 });
    expect(r.vineesh.amountCents).toBe(6000);
    expect(r.val).toMatchObject({ personDays: 30, amountCents: 6000 });
    expect(r.anil).toMatchObject({ personDays: 17, amountCents: 3400 });
    expect(r.divya).toMatchObject({ personDays: 3, amountCents: 600 });
  });

  it("Sept–Oct internet: leftover cents go to the largest remainders and the total is exact", () => {
    const rows = calculateBillSplitCents(
      { amountCents: 9549, serviceStart: "2025-09-16", serviceEnd: "2025-10-15" },
      mckinney
    );
    const r = byId(rows);
    expect(r.anil).toMatchObject({ personDays: 30, amountCents: 4407 });
    expect(r.navya).toMatchObject({ personDays: 15, amountCents: 2204 });
    expect(r.vineesh).toMatchObject({ personDays: 15, amountCents: 2204 });
    expect(r.val).toMatchObject({ personDays: 5, amountCents: 734 });
    expect(r.divya).toMatchObject({ personDays: 0, amountCents: 0 });
    expect(rows.reduce((s, x) => s + x.amountCents, 0)).toBe(9549);
  });

  it("move-in and move-out days both count (inclusive)", () => {
    const r = byId(
      calculateBillSplitCents({ amountCents: 1000, serviceStart: "2025-01-01", serviceEnd: "2025-01-10" }, [
        { tenantId: "a", joinDate: "2025-01-10", leaveDate: null },
        { tenantId: "b", joinDate: "2024-12-01", leaveDate: "2025-01-01" },
      ])
    );
    expect(r.a.personDays).toBe(1);
    expect(r.b.personDays).toBe(1);
    expect(r.a.amountCents + r.b.amountCents).toBe(1000);
  });

  it("nobody present: every share is zero", () => {
    const rows = calculateBillSplitCents(
      { amountCents: 5000, serviceStart: "2026-01-01", serviceEnd: "2026-01-31" },
      [{ tenantId: "x", joinDate: "2026-03-01", leaveDate: null }]
    );
    expect(rows).toEqual([{ tenantId: "x", personDays: 0, totalPersonDays: 0, amountCents: 0 }]);
  });

  it("shares always sum to the bill (randomised)", () => {
    let seed = 42;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let i = 0; i < 500; i++) {
      const n = 1 + Math.floor(rand() * 8);
      const tenants: TenantPeriod[] = Array.from({ length: n }, (_, k) => {
        const join = 1 + Math.floor(rand() * 28);
        const leave = rand() < 0.4 ? Math.min(28, join + Math.floor(rand() * 28)) : null;
        const d = (x: number) => `2026-02-${String(x).padStart(2, "0")}`;
        return { tenantId: `t${k}`, joinDate: d(join), leaveDate: leave ? d(leave) : null };
      });
      const amount = Math.floor(rand() * 100000);
      const rows = calculateBillSplitCents({ amountCents: amount, serviceStart: "2026-02-01", serviceEnd: "2026-02-28" }, tenants);
      const total = rows.reduce((s, x) => s + x.amountCents, 0);
      const anyone = rows.some((x) => x.personDays > 0);
      expect(total).toBe(anyone ? amount : 0);
      rows.filter((x) => x.personDays === 0).forEach((x) => expect(x.amountCents).toBe(0));
    }
  });
});
