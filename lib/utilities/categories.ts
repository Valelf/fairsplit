/** Utility bill categories. Must match the bills / utility_accounts CHECK constraints. */
export const BILL_CATEGORY_VALUES = [
  "electricity",
  "water",
  "gas",
  "internet",
  "trash",
  "other",
] as const;

export type BillCategoryValue = (typeof BILL_CATEGORY_VALUES)[number];

export const BILL_CATEGORY_LABELS: Record<BillCategoryValue, string> = {
  electricity: "Electricity",
  water: "Water",
  gas: "Gas",
  internet: "Internet",
  trash: "Trash",
  other: "Other",
};

export const BILL_CATEGORY_OPTIONS = BILL_CATEGORY_VALUES.map((value) => ({
  value,
  label: BILL_CATEGORY_LABELS[value],
}));

export function isBillCategory(v: unknown): v is BillCategoryValue {
  return typeof v === "string" && (BILL_CATEGORY_VALUES as readonly string[]).includes(v);
}

export function billCategoryLabel(v: string): string {
  return isBillCategory(v) ? BILL_CATEGORY_LABELS[v] : v.charAt(0).toUpperCase() + v.slice(1);
}
