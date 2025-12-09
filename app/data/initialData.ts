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

export const initialCycles: CycleInput[] = [septOctCycle, octNovCycle];

