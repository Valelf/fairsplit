import { describe, expect, it } from "vitest";
import { nextCycleDates, suggestCycleLabel } from "./cycle-label";
import { centsToInput, dollarsToCents } from "./money";
import { earliestAffectedDate, previewTenantDateChange } from "./departure";
import { calculateBillSplitCents, sortTenantPeriods } from "@/lib/calculations/person-days";

describe("suggestCycleLabel", () => {
  it("labels single months, ranges and year boundaries", () => {
    expect(suggestCycleLabel("2026-12-01", "2026-12-31")).toBe("Dec 2026");
    expect(suggestCycleLabel("2026-11-15", "2026-12-14")).toBe("Nov – Dec 2026");
    expect(suggestCycleLabel("2026-12-15", "2027-01-14")).toBe("Dec 2026 – Jan 2027");
  });
  it("returns empty for missing or reversed dates", () => {
    expect(suggestCycleLabel("", "2026-12-31")).toBe("");
    expect(suggestCycleLabel("2027-01-01", "2026-12-31")).toBe("");
  });
});

describe("nextCycleDates", () => {
  it("rolls to the month after the latest cycle, across years", () => {
    expect(nextCycleDates("2026-11-30")).toEqual({ start: "2026-12-01", end: "2026-12-31" });
    expect(nextCycleDates("2026-12-31")).toEqual({ start: "2027-01-01", end: "2027-01-31" });
    expect(nextCycleDates("2027-01-31")).toEqual({ start: "2027-02-01", end: "2027-02-28" });
  });
  it("defaults to the current UTC month", () => {
    expect(nextCycleDates(null, new Date(Date.UTC(2028, 1, 10)))).toEqual({ start: "2028-02-01", end: "2028-02-29" });
  });
});

describe("dollarsToCents", () => {
  it("parses common inputs exactly", () => {
    expect(dollarsToCents("95.49")).toBe(9549);
    expect(dollarsToCents("$1,234.5")).toBe(123450);
    expect(dollarsToCents("12")).toBe(1200);
    expect(dollarsToCents("0.1")).toBe(10);
  });
  it("rejects invalid input", () => {
    expect(dollarsToCents("")).toBeNull();
    expect(dollarsToCents("-5")).toBeNull();
    expect(dollarsToCents("1.234")).toBeNull();
    expect(dollarsToCents("abc")).toBeNull();
  });
  it("round-trips with centsToInput", () => {
    expect(dollarsToCents(centsToInput(9549))).toBe(9549);
  });
});

describe("sortTenantPeriods", () => {
  it("orders by join date, then id", () => {
    const sorted = sortTenantPeriods([
      { tenantId: "b", joinDate: "2025-10-01", leaveDate: null },
      { tenantId: "c", joinDate: "2025-01-01", leaveDate: null },
      { tenantId: "a", joinDate: "2025-10-01", leaveDate: null },
    ]);
    expect(sorted.map((t) => t.tenantId)).toEqual(["c", "a", "b"]);
  });
  it("breaks remainder ties exactly by person-days then order", () => {
    // 100c over 3 equal tenants: 33 each + 1 leftover cent goes to the first in stable order.
    const rows = calculateBillSplitCents(
      { amountCents: 100, serviceStart: "2025-01-01", serviceEnd: "2025-01-01" },
      sortTenantPeriods([
        { tenantId: "z", joinDate: "2024-01-01", leaveDate: null },
        { tenantId: "y", joinDate: "2024-01-01", leaveDate: null },
        { tenantId: "x", joinDate: "2024-01-01", leaveDate: null },
      ])
    );
    expect(rows.map((r) => [r.tenantId, r.amountCents])).toEqual([["x", 34], ["y", 33], ["z", 33]]);
  });
});

describe("previewTenantDateChange", () => {
  const tenants = [
    { tenantId: "a", joinDate: "2025-01-01", leaveDate: null },
    { tenantId: "b", joinDate: "2025-01-01", leaveDate: null },
  ];
  const bills = [
    { billId: "jan", label: "Jan", amountCents: 3100, serviceStart: "2025-01-01", serviceEnd: "2025-01-31" },
    { billId: "feb", label: "Feb", amountCents: 2800, serviceStart: "2025-02-01", serviceEnd: "2025-02-28" },
    { billId: "dec", label: "Dec", amountCents: 1000, serviceStart: "2024-12-01", serviceEnd: "2024-12-31" },
  ];

  it("shows the departing tenant's prorated shares on affected bills only", () => {
    const rows = previewTenantDateChange(bills, tenants, "a", { leaveDate: "2025-01-15" });
    expect(rows.map((r) => r.billId)).toEqual(["jan", "feb"]);
    // Jan: a 15 days, b 31 days → 3100 * 15/46 = 1010.87 → 1011
    expect(rows[0]).toMatchObject({ beforeCents: 1550, afterCents: 1011, beforeDays: 31, afterDays: 15 });
    expect(rows[1]).toMatchObject({ beforeCents: 1400, afterCents: 0, afterDays: 0 });
  });

  it("can list unchanged bills too", () => {
    const rows = previewTenantDateChange(bills, tenants, "a", { leaveDate: "2025-02-28" }, false);
    expect(rows.map((r) => r.billId)).toEqual(["jan", "feb"]);
    expect(rows.every((r) => r.beforeCents === r.afterCents)).toBe(true);
  });

  it("earliestAffectedDate picks the minimum non-empty date", () => {
    expect(earliestAffectedDate(["2025-03-01", null, "2025-01-15", undefined])).toBe("2025-01-15");
    expect(earliestAffectedDate([null])).toBeNull();
  });
});
