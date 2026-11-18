import { describe, expect, it } from "vitest";
import { addMonthsISO, computeCompUntil, COMP_FOREVER, getCompStatus, isIsoDate } from "./comp";

describe("addMonthsISO", () => {
  it("adds months and rolls the year", () => {
    expect(addMonthsISO("2027-11-18", 6)).toBe("2028-05-18");
    expect(addMonthsISO("2027-11-18", 12)).toBe("2028-11-18");
  });
  it("clamps to the end of shorter months", () => {
    expect(addMonthsISO("2027-08-31", 6)).toBe("2028-02-29");
    expect(addMonthsISO("2026-08-31", 6)).toBe("2027-02-28");
  });
});

describe("computeCompUntil", () => {
  const today = "2026-11-18";

  it("extends from the current end date when it is in the future", () => {
    expect(computeCompUntil("1y", "2027-11-18", today)).toEqual({ value: "2028-11-18" });
    expect(computeCompUntil("6m", "2027-11-18", today)).toEqual({ value: "2028-05-18" });
  });

  it("extends from today when the comp has lapsed or never existed", () => {
    expect(computeCompUntil("6m", "2025-01-01", today)).toEqual({ value: "2027-05-18" });
    expect(computeCompUntil("1y", null, today)).toEqual({ value: "2027-11-18" });
  });

  it("handles no end date, clear and picked dates", () => {
    expect(computeCompUntil("forever", "2027-11-18", today)).toEqual({ value: COMP_FOREVER });
    expect(computeCompUntil("clear", "2027-11-18", today)).toEqual({ value: null });
    expect(computeCompUntil("date", null, today, "2027-03-01")).toEqual({ value: "2027-03-01" });
    expect(computeCompUntil("date", null, today, "2026-01-01")).toHaveProperty("error");
    expect(computeCompUntil("date", null, today, "2027-02-30")).toHaveProperty("error");
    expect(computeCompUntil("6m", COMP_FOREVER, today)).toHaveProperty("error");
  });
});

describe("getCompStatus", () => {
  it("classifies comp dates", () => {
    expect(getCompStatus(null, "2026-11-18")).toEqual({ kind: "none" });
    expect(getCompStatus(COMP_FOREVER, "2026-11-18")).toEqual({ kind: "forever" });
    expect(getCompStatus("2026-11-18", "2026-11-18")).toEqual({ kind: "active", until: "2026-11-18" });
    expect(getCompStatus("2026-11-17", "2026-11-18")).toEqual({ kind: "expired", until: "2026-11-17" });
  });
  it("validates ISO dates", () => {
    expect(isIsoDate("2027-11-18")).toBe(true);
    expect(isIsoDate("2027-13-01")).toBe(false);
  });
});
