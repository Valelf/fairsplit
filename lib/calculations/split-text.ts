import type { SplitMethod } from "./person-days";

/** "Show the math" for one tenant's share, matching the bill's split method. */
export function splitMathText(
  split: { person_days: number; total_person_days: number; share_count?: number | null },
  method: SplitMethod | null | undefined
): string {
  if (method === "equal_present") {
    const n = split.share_count ?? 0;
    return n > 0 ? `split equally among ${n} ${n === 1 ? "person" : "people"}` : "split equally";
  }
  return `${split.person_days} of ${split.total_person_days} person-days`;
}

/** Short form for tight table cells. */
export function splitMathShort(
  split: { person_days: number; total_person_days: number; share_count?: number | null },
  method: SplitMethod | null | undefined
): string {
  if (method === "equal_present") return `1 / ${split.share_count ?? "?"} equal`;
  return `${split.person_days} / ${split.total_person_days}`;
}
