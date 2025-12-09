import {
  Bill,
  Person,
  BillSplitResult,
  PersonBillShare,
  CycleInput,
  CycleResult,
  PerCategoryShare,
  PersonCycleSummary,
} from "../types";

function parseISODate(dateStr: string): Date {
  // Always treat as UTC to avoid timezone weirdness
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function isOnOrAfter(a: Date, b: Date): boolean {
  return a.getTime() >= b.getTime();
}

function isOnOrBefore(a: Date, b: Date): boolean {
  return a.getTime() <= b.getTime();
}

/**
 * Given a bill + list of people, computes person-days and dollar share for each person.
 */
export function calculateBillSplit(
  bill: Bill,
  people: Person[]
): BillSplitResult {
  const start = parseISODate(bill.serviceStart);
  const end = parseISODate(bill.serviceEnd);

  // Map personId -> personDays
  const personDaysMap = new Map<string, number>();

  let cursor = start;
  while (isOnOrBefore(cursor, end)) {
    // Find all people active on this day
    const activePeople = people.filter((p) => {
      const join = parseISODate(p.joinDate);
      const leave = p.leaveDate ? parseISODate(p.leaveDate) : undefined;

      const joined = isOnOrAfter(cursor, join) || cursor.getTime() === join.getTime();
      const notLeft =
        !leave || isOnOrBefore(cursor, leave) || cursor.getTime() === leave.getTime();

      return joined && notLeft;
    });

    if (activePeople.length > 0) {
      activePeople.forEach((p) => {
        const current = personDaysMap.get(p.id) ?? 0;
        personDaysMap.set(p.id, current + 1);
      });
    }

    cursor = addDays(cursor, 1);
  }

  const totalPersonDays = Array.from(personDaysMap.values()).reduce(
    (sum, d) => sum + d,
    0
  );

  const personShares: PersonBillShare[] = [];

  if (totalPersonDays === 0) {
    // No one lived there during this period → everyone owes 0
    people.forEach((p) => {
      personShares.push({
        personId: p.id,
        personName: p.name,
        personDays: 0,
        amount: 0,
      });
    });
  } else {
    people.forEach((p) => {
      const days = personDaysMap.get(p.id) ?? 0;
      const rawAmount = (bill.amount * days) / totalPersonDays;
      const amount = Number(rawAmount.toFixed(2)); // round to cents
      personShares.push({
        personId: p.id,
        personName: p.name,
        personDays: days,
        amount,
      });
    });
  }

  return {
    bill,
    personShares,
    totalPersonDays,
  };
}

export function calculateCycle(input: CycleInput): CycleResult {
  const billResults = input.bills.map((bill) =>
    calculateBillSplit(bill, input.people)
  );

  // personId -> PersonCycleSummary
  const perPersonMap = new Map<string, PersonCycleSummary>();

  billResults.forEach((billResult) => {
    const { bill } = billResult;
    billResult.personShares.forEach((share) => {
      const existing = perPersonMap.get(share.personId);
      const perCategoryShare: PerCategoryShare = {
        category: bill.category,
        billId: bill.id,
        provider: bill.provider,
        serviceStart: bill.serviceStart,
        serviceEnd: bill.serviceEnd,
        personDays: share.personDays,
        amount: share.amount,
      };

      if (!existing) {
        perPersonMap.set(share.personId, {
          personId: share.personId,
          personName: share.personName,
          perCategory: [perCategoryShare],
          totalAmount: share.amount,
        });
      } else {
        existing.perCategory.push(perCategoryShare);
        existing.totalAmount = Number(
          (existing.totalAmount + share.amount).toFixed(2)
        );
      }
    });
  });

  const perPerson = Array.from(perPersonMap.values()).sort((a, b) =>
    a.personName.localeCompare(b.personName)
  );

  return {
    cycle: {
      id: input.id,
      label: input.label,
    },
    billResults,
    perPerson,
  };
}

// Helper to format date range for display
export function formatDateRange(start: string, end: string): string {
  const startDate = parseISODate(start);
  const endDate = parseISODate(end);
  
  const startMonth = startDate.toLocaleString('en-US', { month: 'short' });
  const startDay = startDate.getUTCDate();
  const endMonth = endDate.toLocaleString('en-US', { month: 'short' });
  const endDay = endDate.getUTCDate();
  const year = endDate.getUTCFullYear();
  
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

// Helper to format short date range (M/D–M/D)
export function formatShortDateRange(start: string, end: string): string {
  const startDate = parseISODate(start);
  const endDate = parseISODate(end);
  
  const startMonth = startDate.getUTCMonth() + 1;
  const startDay = startDate.getUTCDate();
  const endMonth = endDate.getUTCMonth() + 1;
  const endDay = endDate.getUTCDate();
  
  return `${startMonth}/${startDay}–${endMonth}/${endDay}`;
}

