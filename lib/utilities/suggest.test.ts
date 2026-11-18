import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  continueServiceDates,
  latestBill,
  suggestBill,
  toLast4,
} from "./suggest";
import { BILL_CATEGORY_VALUES, billCategoryLabel, isBillCategory } from "./categories";

describe("addDays / addMonths", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("clamps to the end of shorter months", () => {
    expect(addMonths("2026-01-30", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-30", 1)).toBe("2028-02-29");
    expect(addMonths("2026-10-14", 1)).toBe("2026-11-14");
  });

  it("keeps month-end dates on the month end", () => {
    expect(addMonths("2026-02-28", 1)).toBe("2026-03-31");
    expect(addMonths("2026-10-31", 1)).toBe("2026-11-30");
    expect(addMonths("2026-12-31", 1)).toBe("2027-01-31");
  });

  it("rejects invalid dates", () => {
    expect(addDays("2026-02-30", 1)).toBeNull();
    expect(addMonths("nope", 1)).toBeNull();
  });
});

describe("continueServiceDates", () => {
  it("starts the day after the previous end and runs one month", () => {
    expect(continueServiceDates("2026-10-14")).toEqual({ start: "2026-10-15", end: "2026-11-14" });
    expect(continueServiceDates("2026-10-31")).toEqual({ start: "2026-11-01", end: "2026-11-30" });
    expect(continueServiceDates("2026-12-20")).toEqual({ start: "2026-12-21", end: "2027-01-20" });
  });

  it("returns null without a previous bill", () => {
    expect(continueServiceDates(null)).toBeNull();
    expect(continueServiceDates("")).toBeNull();
  });
});

describe("suggestBill", () => {
  const account = { category: "internet", provider: "Spectrum", typical_amount_cents: 9000 };

  it("uses the previous bill's amount and continues its dates", () => {
    const s = suggestBill(account, {
      amount_cents: 9549,
      service_start: "2026-09-15",
      service_end: "2026-10-14",
    });
    expect(s).toMatchObject({
      category: "internet",
      provider: "Spectrum",
      amount_cents: 9549,
      amountSource: "last",
      service_start: "2026-10-15",
      service_end: "2026-11-14",
      datesSource: "continued",
    });
  });

  it("falls back to typical amount and cycle dates", () => {
    const s = suggestBill(account, null, { start_date: "2026-12-01", end_date: "2026-12-31" });
    expect(s).toMatchObject({
      amount_cents: 9000,
      amountSource: "typical",
      service_start: "2026-12-01",
      service_end: "2026-12-31",
      datesSource: "cycle",
    });
  });

  it("leaves fields blank when nothing is known", () => {
    const s = suggestBill({ ...account, typical_amount_cents: null }, null, null);
    expect(s.amount_cents).toBeNull();
    expect(s.amountSource).toBeNull();
    expect(s.service_start).toBe("");
    expect(s.datesSource).toBeNull();
  });
});

describe("latestBill", () => {
  it("picks the bill with the latest service end", () => {
    const a = { id: "a", service_start: "2026-08-15", service_end: "2026-09-14" };
    const b = { id: "b", service_start: "2026-09-15", service_end: "2026-10-14" };
    expect(latestBill([b, a])?.id).toBe("b");
    expect(latestBill([])).toBeNull();
  });
});

describe("toLast4", () => {
  it("keeps only the last four alphanumerics", () => {
    expect(toLast4("8245 1234 5678 9012")).toBe("9012");
    expect(toLast4("AB-12")).toBe("AB12");
    expect(toLast4("12")).toBe("12");
    expect(toLast4("  -- ")).toBeNull();
    expect(toLast4(null)).toBeNull();
  });
});

describe("categories", () => {
  it("includes gas and trash", () => {
    expect(BILL_CATEGORY_VALUES).toContain("gas");
    expect(BILL_CATEGORY_VALUES).toContain("trash");
    expect(isBillCategory("trash")).toBe(true);
    expect(isBillCategory("cable")).toBe(false);
    expect(billCategoryLabel("electricity")).toBe("Electricity");
  });
});
