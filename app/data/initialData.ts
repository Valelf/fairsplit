import { Person, Bill, CycleInput } from "../types";

// Define all people
export const allPeople: Person[] = [
  {
    id: "anil",
    name: "Anil",
    joinDate: "2025-01-01", // Updated: moved in on Jan 1
    leaveDate: "2025-10-30", // Anil left on Oct 30
  },
  {
    id: "navya",
    name: "Navya",
    joinDate: "2025-10-01", // Updated: moved in on Oct 1
  },
  {
    id: "vineesh",
    name: "Vineesh",
    joinDate: "2025-10-01", // Updated: moved in on Oct 1
  },
  {
    id: "val",
    name: "Val",
    joinDate: "2025-10-11", // Updated: moved in on Oct 11
  },
  {
    id: "divya",
    name: "Divya",
    joinDate: "2025-11-10", // Updated: moved in on Nov 10
  },
];

// Sept-Oct Cycle
const septOctBills: Bill[] = [
  {
    id: "sept-oct-internet",
    category: "internet",
    provider: "Spectrum",
    amount: 95.49,
    serviceStart: "2025-09-16",
    serviceEnd: "2025-10-15",
  },
  {
    id: "sept-oct-electricity",
    category: "electricity",
    provider: "CoServ",
    amount: 276.0,
    serviceStart: "2025-09-15",
    serviceEnd: "2025-10-14",
  },
  {
    id: "sept-oct-water",
    category: "water",
    provider: "City of McKinney",
    amount: 132.93,
    serviceStart: "2025-09-16",
    serviceEnd: "2025-10-21",
  },
];

export const septOctCycle: CycleInput = {
  id: "sept-oct-2025",
  label: "Sept – Oct",
  bills: septOctBills,
  people: allPeople,
};

// Oct-Nov Cycle
const octNovBills: Bill[] = [
  {
    id: "oct-nov-internet",
    category: "internet",
    provider: "Spectrum",
    amount: 95.49,
    serviceStart: "2025-10-16",
    serviceEnd: "2025-11-15",
  },
  {
    id: "oct-nov-electricity",
    category: "electricity",
    provider: "CoServ",
    amount: 220.0,
    serviceStart: "2025-10-14",
    serviceEnd: "2025-11-12",
  },
  {
    id: "oct-nov-water",
    category: "water",
    provider: "City of McKinney",
    amount: 113.59,
    serviceStart: "2025-10-21",
    serviceEnd: "2025-11-17",
  },
];

export const octNovCycle: CycleInput = {
  id: "oct-nov-2025",
  label: "Oct – Nov",
  bills: octNovBills,
  people: allPeople,
};

// ---------------------------------------------------------------------------
// 2026 cycles (added Nov 2026). The two 2025 cycles above are untouched and
// still display their pre-calculated results.
// Each 2026 cycle groups the three bills issued in that month.
// ---------------------------------------------------------------------------

// Residents for the 2026 cycles. Anil (left Oct 2025) is not included.
// Navya and Vineesh moved out May 31, 2026; Nikita and Aakash took their
// places from June 1, 2026. Dinesh took Val's place from Aug 1, 2026.
export const people2026: Person[] = [
  { id: "nikita", name: "Nikita", joinDate: "2026-06-01" },
  { id: "aakash", name: "Aakash", joinDate: "2026-06-01" },
  { id: "val", name: "Val", joinDate: "2025-10-11", leaveDate: "2026-07-31" },
  { id: "divya", name: "Divya", joinDate: "2025-11-10", leaveDate: "2026-10-15" },
  { id: "dinesh", name: "Dinesh", joinDate: "2026-08-01" },
];

// Aug 2026 bills
const aug2026Bills: Bill[] = [
  {
    id: "aug-2026-internet",
    category: "internet",
    provider: "Spectrum",
    amount: 95.49,
    serviceStart: "2026-08-16",
    serviceEnd: "2026-09-15",
  },
  {
    id: "aug-2026-electricity",
    category: "electricity",
    provider: "CoServ",
    amount: 360.0,
    serviceStart: "2026-07-15",
    serviceEnd: "2026-08-13",
  },
  {
    id: "aug-2026-water",
    category: "water",
    provider: "City of McKinney",
    amount: 136.39,
    serviceStart: "2026-07-21",
    serviceEnd: "2026-08-18",
  },
];

export const aug2026Cycle: CycleInput = {
  id: "aug-2026",
  label: "Aug 2026",
  bills: aug2026Bills,
  people: people2026,
};

// Sep 2026 bills
const sep2026Bills: Bill[] = [
  {
    id: "sep-2026-internet",
    category: "internet",
    provider: "Spectrum",
    amount: 95.49,
    serviceStart: "2026-09-16",
    serviceEnd: "2026-10-15",
  },
  {
    id: "sep-2026-electricity",
    category: "electricity",
    provider: "CoServ",
    amount: 442.0,
    serviceStart: "2026-08-13",
    serviceEnd: "2026-09-15",
  },
  {
    id: "sep-2026-water",
    category: "water",
    provider: "City of McKinney",
    amount: 136.39,
    serviceStart: "2026-08-18",
    serviceEnd: "2026-09-21",
  },
];

export const sep2026Cycle: CycleInput = {
  id: "sep-2026",
  label: "Sep 2026",
  bills: sep2026Bills,
  people: people2026,
};

// Oct 2026 bills
const oct2026Bills: Bill[] = [
  {
    id: "oct-2026-internet",
    category: "internet",
    provider: "Spectrum",
    amount: 95.49,
    serviceStart: "2026-10-16",
    serviceEnd: "2026-11-15",
  },
  {
    id: "oct-2026-electricity",
    category: "electricity",
    provider: "CoServ",
    amount: 293.0,
    serviceStart: "2026-09-15",
    serviceEnd: "2026-10-14",
  },
  {
    id: "oct-2026-water",
    category: "water",
    provider: "City of McKinney",
    amount: 131.39,
    serviceStart: "2026-09-21",
    serviceEnd: "2026-10-20",
  },
];

export const oct2026Cycle: CycleInput = {
  id: "oct-2026",
  label: "Oct 2026",
  bills: oct2026Bills,
  people: people2026,
};

export const initialCycles: CycleInput[] = [
  septOctCycle,
  octNovCycle,
  aug2026Cycle,
  sep2026Cycle,
  oct2026Cycle,
];

