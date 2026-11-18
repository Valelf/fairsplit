import { describe, expect, it } from "vitest";
import { splitMathShort, splitMathText } from "./split-text";

describe("splitMathText", () => {
  const s = { person_days: 30, total_person_days: 110, share_count: 4 };
  it("describes person-day splits", () => {
    expect(splitMathText(s, "person_days")).toBe("30 of 110 person-days");
    expect(splitMathText(s, undefined)).toBe("30 of 110 person-days");
    expect(splitMathShort(s, "person_days")).toBe("30 / 110");
  });
  it("describes equal splits", () => {
    expect(splitMathText(s, "equal_present")).toBe("split equally among 4 people");
    expect(splitMathText({ ...s, share_count: 1 }, "equal_present")).toBe("split equally among 1 person");
    expect(splitMathShort(s, "equal_present")).toBe("1 / 4 equal");
  });
});
