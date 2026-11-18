import { describe, expect, it } from "vitest";
import {
  cycleLabel,
  defaultCycleDates,
  deriveOnboardingStep,
  describeShare,
  firstBillSchema,
  houseSchema,
  isIsoDate,
  nextStep,
  parseDollarsToCents,
  previousStep,
  resolveOnboardingStep,
  tenantSchema,
} from "./steps";

const empty = { hasProperty: false, tenantCount: 0, billCount: 0 };

describe("deriveOnboardingStep", () => {
  it("walks house → tenants → bill → done from data", () => {
    expect(deriveOnboardingStep(empty)).toBe("house");
    expect(deriveOnboardingStep({ ...empty, hasProperty: true })).toBe("tenants");
    expect(deriveOnboardingStep({ hasProperty: true, tenantCount: 2, billCount: 0 })).toBe("bill");
    expect(deriveOnboardingStep({ hasProperty: true, tenantCount: 2, billCount: 1 })).toBe("done");
  });
  it("a bill without tenants still asks for tenants first", () => {
    expect(deriveOnboardingStep({ hasProperty: true, tenantCount: 0, billCount: 1 })).toBe("tenants");
  });
});

describe("resolveOnboardingStep", () => {
  const withHouse = { hasProperty: true, tenantCount: 0, billCount: 0 };
  it("honours an explicit step (skip / back)", () => {
    expect(resolveOnboardingStep(withHouse, "bill")).toBe("bill");
    expect(resolveOnboardingStep(withHouse, "house")).toBe("house");
    expect(resolveOnboardingStep(empty, "done")).toBe("done");
  });
  it("needs a house before tenants or bills", () => {
    expect(resolveOnboardingStep(empty, "tenants")).toBe("house");
    expect(resolveOnboardingStep(empty, "bill")).toBe("house");
  });
  it("ignores junk and falls back to derived step", () => {
    expect(resolveOnboardingStep(withHouse, "admin")).toBe("tenants");
    expect(resolveOnboardingStep(withHouse, null)).toBe("tenants");
    expect(resolveOnboardingStep(withHouse, undefined)).toBe("tenants");
  });
  it("next/previous", () => {
    expect(nextStep("house")).toBe("tenants");
    expect(nextStep("done")).toBe("done");
    expect(previousStep("house")).toBeNull();
    expect(previousStep("bill")).toBe("tenants");
  });
});

describe("dates and money", () => {
  it("isIsoDate rejects impossible dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-2-3")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
  it("defaultCycleDates is last full month in UTC", () => {
    expect(defaultCycleDates(new Date("2026-11-18T03:00:00Z"))).toEqual({ start: "2026-10-01", end: "2026-10-31" });
    expect(defaultCycleDates(new Date("2026-01-05T00:00:00Z"))).toEqual({ start: "2025-12-01", end: "2025-12-31" });
    expect(defaultCycleDates(new Date("2028-03-01T00:00:00Z"))).toEqual({ start: "2028-02-01", end: "2028-02-29" });
  });
  it("cycleLabel", () => {
    expect(cycleLabel("2026-10-01", "2026-10-31")).toBe("Oct 2026");
    expect(cycleLabel("2026-10-15", "2026-11-14")).toBe("Oct 15 – Nov 14, 2026");
    expect(cycleLabel("2026-12-15", "2027-01-14")).toBe("Dec 15, 2026 – Jan 14, 2027");
  });
  it("parseDollarsToCents", () => {
    expect(parseDollarsToCents("142.50")).toBe(14250);
    expect(parseDollarsToCents("$1,234.5")).toBe(123450);
    expect(parseDollarsToCents("12")).toBe(1200);
    expect(parseDollarsToCents("0.07")).toBe(7);
    expect(parseDollarsToCents("12.345")).toBeNull();
    expect(parseDollarsToCents("-5")).toBeNull();
    expect(parseDollarsToCents("abc")).toBeNull();
  });
  it("describeShare", () => {
    expect(describeShare(31, 62, 10000)).toBe("31 of 62 person-days × $100.00");
  });
});

describe("validation", () => {
  it("house: name required, address optional", () => {
    expect(houseSchema.safeParse({ name: "Elm St" }).success).toBe(true);
    const parsed = houseSchema.parse({ name: "  Elm St " });
    expect(parsed).toEqual({ name: "Elm St", address_line1: "", city: "", state: "", zip_code: "" });
    expect(houseSchema.safeParse({ name: "  " }).success).toBe(false);
  });
  it("tenant: email normalised, date checked", () => {
    expect(tenantSchema.parse({ display_name: "Ana", email: " Ana@X.com ", join_date: "2026-10-01" }).email).toBe("ana@x.com");
    expect(tenantSchema.safeParse({ display_name: "Ana", email: "nope", join_date: "2026-10-01" }).success).toBe(false);
    expect(tenantSchema.safeParse({ display_name: "Ana", email: "a@x.com", join_date: "2026-13-01" }).success).toBe(false);
  });
  it("first bill: amount and date order", () => {
    const ok = {
      property_id: "8d6f7e1c-2b9a-4c3d-9e8f-1a2b3c4d5e6f",
      cycle_start: "2026-10-01",
      cycle_end: "2026-10-31",
      category: "electricity",
      provider: "City Power",
      amount: "142.50",
      service_start: "2026-10-01",
      service_end: "2026-10-31",
    };
    expect(firstBillSchema.safeParse(ok).success).toBe(true);
    expect(firstBillSchema.safeParse({ ...ok, amount: "0" }).success).toBe(false);
    const badOrder = firstBillSchema.safeParse({ ...ok, service_end: "2026-09-30" });
    expect(badOrder.success).toBe(false);
    expect(badOrder.error?.issues[0].path).toEqual(["service_end"]);
    expect(firstBillSchema.safeParse({ ...ok, cycle_end: "2026-09-01" }).success).toBe(false);
  });
});
