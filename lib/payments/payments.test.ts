import { describe, expect, it } from "vitest";
import {
  buildCashAppLink,
  buildPaymentNote,
  buildPaypalLink,
  buildVenmoLinks,
  centsToAmountString,
  displayStatus,
  hasAnyPaymentMethod,
  normalizeCashtag,
  normalizePaypalMe,
  normalizeVenmoHandle,
  summarizeSplits,
  todayUTC,
} from "./index";

describe("centsToAmountString", () => {
  it("formats cents without separators", () => {
    expect(centsToAmountString(0)).toBe("0.00");
    expect(centsToAmountString(5)).toBe("0.05");
    expect(centsToAmountString(12345)).toBe("123.45");
    expect(centsToAmountString(123456789)).toBe("1234567.89");
  });
  it("clamps negatives and rounds fractions", () => {
    expect(centsToAmountString(-100)).toBe("0.00");
    expect(centsToAmountString(99.6)).toBe("1.00");
  });
});

describe("handle normalisation", () => {
  it("strips @, $ and pasted URLs", () => {
    expect(normalizeVenmoHandle(" @Shekar-R ")).toBe("Shekar-R");
    expect(normalizeVenmoHandle("https://venmo.com/u/Shekar-R")).toBe("Shekar-R");
    expect(normalizeCashtag("$shekar")).toBe("shekar");
    expect(normalizeCashtag("https://cash.app/$shekar")).toBe("shekar");
    expect(normalizePaypalMe("paypal.me/shekar")).toBe("shekar");
    expect(normalizePaypalMe("https://www.paypal.me/shekar/10")).toBe("shekar");
    expect(normalizeVenmoHandle(null)).toBe("");
  });
});

describe("deep links", () => {
  it("builds venmo app + web links with encoded note", () => {
    const links = buildVenmoLinks("@shekar", 4250, "FairSplit · Oct & Nov")!;
    expect(links.app).toBe(
      "venmo://paycharge?txn=pay&recipients=shekar&amount=42.50&note=FairSplit+%C2%B7+Oct+%26+Nov"
    );
    expect(links.web).toBe("https://venmo.com/shekar?txn=pay&amount=42.50&note=FairSplit+%C2%B7+Oct+%26+Nov");
  });
  it("returns null when no handle", () => {
    expect(buildVenmoLinks("  ", 100, "x")).toBeNull();
    expect(buildCashAppLink("", 100)).toBeNull();
    expect(buildPaypalLink("@", 100)).toBeNull();
  });
  it("builds cash app and paypal links", () => {
    expect(buildCashAppLink("$shekar", 1999)).toBe("https://cash.app/$shekar/19.99");
    expect(buildPaypalLink("shekar", 1999)).toBe("https://paypal.me/shekar/19.99USD");
  });
  it("builds a short note", () => {
    expect(buildPaymentNote("575 McKinney", "Oct 2025")).toBe("FairSplit · 575 McKinney · Oct 2025");
    expect(buildPaymentNote("x".repeat(200), "y").length).toBe(140);
  });
});

describe("summarizeSplits", () => {
  it("is owed if anything is owed", () => {
    const s = summarizeSplits([
      { amount_cents: 100, payment_status: "confirmed" },
      { amount_cents: 200, payment_status: "marked_paid" },
      { amount_cents: 300, payment_status: "owed" },
    ]);
    expect(s).toMatchObject({
      status: "owed",
      owedCents: 300,
      markedPaidCents: 200,
      confirmedCents: 100,
      totalCents: 600,
      splitCount: 3,
    });
  });
  it("is marked_paid if nothing owed but something unconfirmed", () => {
    expect(
      summarizeSplits([
        { amount_cents: 100, payment_status: "confirmed" },
        { amount_cents: 200, payment_status: "marked_paid" },
      ]).status
    ).toBe("marked_paid");
  });
  it("is confirmed when all confirmed; null status counts as owed", () => {
    expect(summarizeSplits([{ amount_cents: 1, payment_status: "confirmed" }]).status).toBe("confirmed");
    expect(summarizeSplits([{ amount_cents: 1, payment_status: null }]).status).toBe("owed");
  });
});

describe("displayStatus", () => {
  it("marks owed as overdue only after the due date", () => {
    expect(displayStatus("owed", "2026-12-01", "2026-12-01")).toBe("owed");
    expect(displayStatus("owed", "2026-12-01", "2026-12-02")).toBe("overdue");
    expect(displayStatus("owed", null, "2030-01-01")).toBe("owed");
  });
  it("never marks paid statuses overdue", () => {
    expect(displayStatus("marked_paid", "2020-01-01", "2026-12-02")).toBe("marked_paid");
    expect(displayStatus("confirmed", "2020-01-01", "2026-12-02")).toBe("confirmed");
  });
  it("todayUTC uses the UTC date", () => {
    expect(todayUTC(new Date("2026-11-18T23:30:00-08:00"))).toBe("2026-11-19");
  });
});

describe("hasAnyPaymentMethod", () => {
  it("detects configured methods", () => {
    expect(hasAnyPaymentMethod(null)).toBe(false);
    expect(hasAnyPaymentMethod({ venmo_handle: null, zelle_contact: "" })).toBe(false);
    expect(hasAnyPaymentMethod({ zelle_contact: "a@b.co" })).toBe(true);
  });
});
