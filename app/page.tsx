"use client";

import { useState, useEffect } from "react";
import { CycleInput, CycleResult, UtilityCategory } from "./types";
import { calculateCycle, formatDateRange, formatShortDateRange } from "./utils/calculations";
import { initialCycles, allPeople } from "./data/initialData";
import { precalculatedResults } from "./data/precalculatedData";
import AddCycleModal from "./components/AddCycleModal";

const categoryIcons: Record<UtilityCategory, string> = {
  internet: "💻",
  electricity: "⚡",
  water: "💧",
  other: "📦",
};

const categoryLabels: Record<UtilityCategory, string> = {
  internet: "Internet",
  electricity: "Electricity",
  water: "Water",
  other: "Other",
};

// Helper function to calculate actual occupancy period for a person in a bill
function getActualPeriod(
  billStart: string,
  billEnd: string,
  personDays: number,
  personId: string,
  people: any[]
): string {
  if (personDays === 0) return "-";
  
  const person = people.find(p => p.id === personId);
  if (!person) return "-";
  
  // Parse dates as UTC to avoid timezone issues
  const parseDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  };
  
  const billStartDate = parseDate(billStart);
  const billEndDate = parseDate(billEnd);
  const joinDate = parseDate(person.joinDate);
  const leaveDate = person.leaveDate ? parseDate(person.leaveDate) : null;
  
  // Calculate overlap - the actual period the person lived during this bill
  const actualStart = joinDate > billStartDate ? joinDate : billStartDate;
  const actualEnd = leaveDate && leaveDate < billEndDate ? leaveDate : billEndDate;
  
  // If person didn't live during this period, return "-"
  if (actualStart > actualEnd) return "-";
  
  // Format as ISO strings
  const formatDate = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const actualStartStr = formatDate(actualStart);
  const actualEndStr = formatDate(actualEnd);
  
  return formatShortDateRange(actualStartStr, actualEndStr);
}

export default function Home() {
  const [cycles, setCycles] = useState<CycleInput[]>([]);
  const [selectedCycleIndex, setSelectedCycleIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load cycles from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("billCycles");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Update people array in all cycles to use latest data from initialData
        const updatedCycles = parsed.map((cycle: CycleInput, index: number) => {
          // For first 2 cycles, always use allPeople from initialData
          if (index < 2) {
            return { ...cycle, people: allPeople };
          }
          // For new cycles, keep their custom people but update any matching IDs
          return cycle;
        });
        setCycles(updatedCycles);
      } catch {
        setCycles(initialCycles);
      }
    } else {
      setCycles(initialCycles);
    }
  }, []);

  // Save cycles to localStorage whenever they change
  useEffect(() => {
    if (cycles.length > 0) {
      localStorage.setItem("billCycles", JSON.stringify(cycles));
    }
  }, [cycles]);

  const handleAddCycle = (newCycle: CycleInput) => {
    setCycles([...cycles, newCycle]);
    setSelectedCycleIndex(cycles.length); // Switch to the new cycle
  };

  const handleDeleteCycle = (index: number) => {
    // Prevent deletion of the first 2 initial cycles
    if (index < 2) {
      alert("Cannot delete initial billing cycles. Only newly created cycles can be deleted.");
      return;
    }
    
    if (confirm("Are you sure you want to delete this billing cycle?")) {
      const newCycles = cycles.filter((_, i) => i !== index);
      setCycles(newCycles);
      if (selectedCycleIndex >= newCycles.length) {
        setSelectedCycleIndex(Math.max(0, newCycles.length - 1));
      }
    }
  };

  if (cycles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Billing Cycles</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add First Billing Cycle
          </button>
          <AddCycleModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onAdd={handleAddCycle}
            existingPeople={allPeople}
          />
        </div>
      </div>
    );
  }

  const currentCycle = cycles[selectedCycleIndex];
  
  // Use pre-calculated data for the first 2 cycles, dynamic calculation for new ones
  const result: CycleResult = selectedCycleIndex < 2 
    ? precalculatedResults[selectedCycleIndex]
    : calculateCycle(currentCycle);

  // Group bills by category for the metric cards
  const billsByCategory = new Map<UtilityCategory, typeof result.billResults[0]>();
  result.billResults.forEach((br) => {
    billsByCategory.set(br.bill.category, br);
  });

  const categories: UtilityCategory[] = ["internet", "electricity", "water", "other"];
  const displayCategories = categories.filter(cat => billsByCategory.has(cat));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Add Button */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              575 McKinney Tenants&apos; Utility Bills
            </h1>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-md flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            Add Billing Cycle
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {cycles.map((cycle, index) => {
            const isInitialCycle = index < 2; // First 2 cycles are locked
            const canDelete = !isInitialCycle && cycles.length > 1;
            
            return (
              <div key={cycle.id} className="relative group">
                <button
                  onClick={() => setSelectedCycleIndex(index)}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    selectedCycleIndex === index
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {cycle.label}
                  {isInitialCycle && (
                    <span className="ml-2 text-xs opacity-75">🔒</span>
                  )}
                </button>
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCycle(index);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                    title="Delete cycle"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Cycle Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {result.cycle.label}
            </h2>
            <p className="text-sm text-gray-500">
              Day-based fair split for utilities across tenants.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Total Amount</p>
            <p className="text-3xl font-bold text-gray-900">
              ${result.perPerson
                .reduce((sum, p) => sum + p.totalAmount, 0)
                .toFixed(2)}
            </p>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {displayCategories.map((category) => {
            const billResult = billsByCategory.get(category)!;
            const bill = billResult.bill;
            return (
              <div
                key={bill.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{categoryIcons[category]}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {categoryLabels[category]}
                    </h3>
                    <p className="text-sm text-gray-600">{bill.provider}</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-2">
                  ${bill.amount.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDateRange(bill.serviceStart, bill.serviceEnd)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50">
                    Person
                  </th>
                  {displayCategories.map((category) => (
                    <th
                      key={`${category}-amt`}
                      colSpan={3}
                      className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-l border-gray-200"
                    >
                      {categoryLabels[category]}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-l border-gray-200">
                    Total Owed
                  </th>
                </tr>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-50">
                    {/* Empty for person column */}
                  </th>
                  {displayCategories.map((category) => (
                    <>
                      <th
                        key={`${category}-amt-sub`}
                        className="px-2 py-2 text-left text-xs font-medium text-gray-500 border-l border-gray-200"
                      >
                        Amt
                      </th>
                      <th
                        key={`${category}-period-sub`}
                        className="px-2 py-2 text-left text-xs font-medium text-gray-500"
                      >
                        Period
                      </th>
                      <th
                        key={`${category}-days-sub`}
                        className="px-2 py-2 text-left text-xs font-medium text-gray-500"
                      >
                        Days
                      </th>
                    </>
                  ))}
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-l border-gray-200">
                    {/* Empty for total column */}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {result.perPerson.map((person) => (
                  <tr key={person.personId}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                      {person.personName}
                    </td>
                    {displayCategories.map((category) => {
                      const share = person.perCategory.find(
                        (pc) => pc.category === category
                      );
                      if (!share) {
                        return (
                          <>
                            <td
                              key={`${person.personId}-${category}-amt`}
                              className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 border-l border-gray-200"
                            >
                              0.00
                            </td>
                            <td
                              key={`${person.personId}-${category}-period`}
                              className="px-2 py-3 whitespace-nowrap text-sm text-gray-500"
                            >
                              -
                            </td>
                            <td
                              key={`${person.personId}-${category}-days`}
                              className="px-2 py-3 whitespace-nowrap text-sm text-gray-500"
                            >
                              0
                            </td>
                          </>
                        );
                      }
                      return (
                        <>
                          <td
                            key={`${person.personId}-${category}-amt`}
                            className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 border-l border-gray-200"
                          >
                            {share.amount.toFixed(2)}
                          </td>
                          <td
                            key={`${person.personId}-${category}-period`}
                            className="px-2 py-3 whitespace-nowrap text-sm text-gray-900"
                          >
                            {getActualPeriod(
                              share.serviceStart,
                              share.serviceEnd,
                              share.personDays,
                              person.personId,
                              currentCycle.people
                            )}
                          </td>
                          <td
                            key={`${person.personId}-${category}-days`}
                            className="px-2 py-3 whitespace-nowrap text-sm text-gray-900"
                          >
                            {share.personDays}
                          </td>
                        </>
                      );
                    })}
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 border-l border-gray-200">
                      {person.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-gray-100">
                    Total
                  </td>
                  {displayCategories.map((category) => {
                    return (
                      <>
                        <td
                          key={`total-${category}-amt`}
                          className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 border-l border-gray-200"
                        >
                        </td>
                        <td
                          key={`total-${category}-period`}
                          className="px-2 py-3 whitespace-nowrap text-sm text-gray-900"
                        >
                        </td>
                        <td
                          key={`total-${category}-days`}
                          className="px-2 py-3 whitespace-nowrap text-sm text-gray-900"
                        >
                        </td>
                      </>
                    );
                  })}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-l border-gray-200">
                    {result.perPerson
                      .reduce((sum, p) => sum + p.totalAmount, 0)
                      .toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddCycleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddCycle}
        existingPeople={allPeople}
      />
    </div>
  );
}
