export type UtilityCategory = "internet" | "electricity" | "water" | "other";

export interface Person {
  id: string;
  name: string;
  /** ISO date string: "2025-10-11" */
  joinDate: string;
  /** ISO date string, inclusive last day, or undefined if still here */
  leaveDate?: string;
}

export interface Bill {
  id: string;
  category: UtilityCategory;
  provider: string;
  /** total dollar amount for this bill */
  amount: number;
  /** ISO start date, inclusive */
  serviceStart: string;
  /** ISO end date, inclusive */
  serviceEnd: string;
}

export interface PersonBillShare {
  personId: string;
  personName: string;
  personDays: number;
  amount: number;
}

export interface BillSplitResult {
  bill: Bill;
  personShares: PersonBillShare[];
  totalPersonDays: number;
}

export interface CycleInput {
  id: string;
  label: string; // e.g. "Sept – Oct 2025"
  bills: Bill[];
  people: Person[];
}

export interface PerCategoryShare {
  category: UtilityCategory;
  billId: string;
  provider: string;
  serviceStart: string;
  serviceEnd: string;
  personDays: number;
  amount: number;
}

export interface PersonCycleSummary {
  personId: string;
  personName: string;
  perCategory: PerCategoryShare[];
  totalAmount: number;
}

export interface CycleResult {
  cycle: Pick<CycleInput, "id" | "label">;
  billResults: BillSplitResult[];
  perPerson: PersonCycleSummary[];
}

