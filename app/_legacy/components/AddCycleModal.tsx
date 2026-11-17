"use client";

import { useState, useEffect } from "react";
import { Person, Bill, CycleInput, UtilityCategory } from "../types";

interface AddCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (cycle: CycleInput) => void;
  existingPeople: Person[];
}

export default function AddCycleModal({
  isOpen,
  onClose,
  onAdd,
  existingPeople,
}: AddCycleModalProps) {
  const [label, setLabel] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  
  // Form state for adding new person
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonJoinDate, setNewPersonJoinDate] = useState("");
  const [newPersonLeaveDate, setNewPersonLeaveDate] = useState("");
  
  // Reset people list when modal opens
  useEffect(() => {
    if (isOpen) {
      // Filter to only show active people (no leave date or future leave date)
      const today = new Date();
      const activePeople = existingPeople.filter(p => {
        if (!p.leaveDate) return true;
        const leaveDate = new Date(p.leaveDate);
        return leaveDate > today;
      });
      setPeople(activePeople);
    }
  }, [isOpen, existingPeople]);
  
  // Get inactive people (those who have left)
  const today = new Date();
  const inactivePeople = existingPeople.filter(p => {
    if (!p.leaveDate) return false;
    const leaveDate = new Date(p.leaveDate);
    return leaveDate <= today;
  });
  
  // Form state for adding new bill
  const [newBillCategory, setNewBillCategory] = useState<UtilityCategory>("internet");
  const [newBillProvider, setNewBillProvider] = useState("");
  const [newBillAmount, setNewBillAmount] = useState("");
  const [newBillServiceStart, setNewBillServiceStart] = useState("");
  const [newBillServiceEnd, setNewBillServiceEnd] = useState("");

  const handleAddPerson = () => {
    if (!newPersonName || !newPersonJoinDate) return;
    
    const newPerson: Person = {
      id: `person-${Date.now()}`,
      name: newPersonName,
      joinDate: newPersonJoinDate,
      leaveDate: newPersonLeaveDate || undefined,
    };
    
    setPeople([...people, newPerson]);
    setNewPersonName("");
    setNewPersonJoinDate("");
    setNewPersonLeaveDate("");
  };

  const handleRemovePerson = (id: string) => {
    setPeople(people.filter(p => p.id !== id));
  };

  const handleAddBill = () => {
    if (!newBillProvider || !newBillAmount || !newBillServiceStart || !newBillServiceEnd) return;
    
    const newBill: Bill = {
      id: `bill-${Date.now()}`,
      category: newBillCategory,
      provider: newBillProvider,
      amount: parseFloat(newBillAmount),
      serviceStart: newBillServiceStart,
      serviceEnd: newBillServiceEnd,
    };
    
    setBills([...bills, newBill]);
    setNewBillProvider("");
    setNewBillAmount("");
    setNewBillServiceStart("");
    setNewBillServiceEnd("");
  };

  const handleRemoveBill = (id: string) => {
    setBills(bills.filter(b => b.id !== id));
  };

  const handleSubmit = () => {
    if (!label || bills.length === 0 || people.length === 0) {
      alert("Please fill in all required fields: cycle label, at least one bill, and at least one person.");
      return;
    }
    
    // Combine active people with inactive people for calculation purposes
    const allPeopleForCycle = [...people, ...inactivePeople];
    
    const newCycle: CycleInput = {
      id: `cycle-${Date.now()}`,
      label,
      bills,
      people: allPeopleForCycle,
    };
    
    onAdd(newCycle);
    
    // Reset form
    setLabel("");
    setBills([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Add New Billing Cycle</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Cycle Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cycle Label *
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Nov – Dec 2025"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* People Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">People</h3>
            
            {/* Active People */}
            <div className="space-y-2 mb-4">
              {people.map((person) => (
                <div key={person.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200">
                  <div>
                    <span className="font-medium">{person.name}</span>
                    <span className="text-sm text-gray-600 ml-3">
                      Join: {person.joinDate}
                      {person.leaveDate && ` | Leave: ${person.leaveDate}`}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemovePerson(person.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            
            {/* Inactive People - Not Editable */}
            {inactivePeople.length > 0 && (
              <div className="space-y-2 mb-4">
                {inactivePeople.map((person) => (
                  <div key={person.id} className="flex items-center justify-between bg-gray-100 p-3 rounded-md border border-gray-300 opacity-75">
                    <div>
                      <span className="font-medium text-gray-700">{person.name}</span>
                      <span className="text-sm text-gray-600 ml-3">
                        Join: {person.joinDate} | Leave: {person.leaveDate}
                      </span>
                    </div>
                    <span className="text-xs font-semibold bg-gray-300 text-gray-700 px-3 py-1 rounded-full">
                      Not staying anymore
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Add New Person</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Name"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="date"
                  value={newPersonJoinDate}
                  onChange={(e) => setNewPersonJoinDate(e.target.value)}
                  placeholder="Join Date"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="date"
                  value={newPersonLeaveDate}
                  onChange={(e) => setNewPersonLeaveDate(e.target.value)}
                  placeholder="Leave Date (optional)"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <button
                  onClick={handleAddPerson}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Add Person
                </button>
              </div>
            </div>
          </div>

          {/* Bills Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Bills</h3>
            <div className="space-y-2 mb-4">
              {bills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <div>
                    <span className="font-medium capitalize">{bill.category}</span>
                    <span className="text-sm text-gray-600 ml-3">
                      {bill.provider} | ${bill.amount.toFixed(2)} | {bill.serviceStart} to {bill.serviceEnd}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveBill(bill.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            
            <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Add New Bill</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <select
                  value={newBillCategory}
                  onChange={(e) => setNewBillCategory(e.target.value as UtilityCategory)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="internet">Internet</option>
                  <option value="electricity">Electricity</option>
                  <option value="water">Water</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="text"
                  value={newBillProvider}
                  onChange={(e) => setNewBillProvider(e.target.value)}
                  placeholder="Provider"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="number"
                  step="0.01"
                  value={newBillAmount}
                  onChange={(e) => setNewBillAmount(e.target.value)}
                  placeholder="Amount"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="date"
                  value={newBillServiceStart}
                  onChange={(e) => setNewBillServiceStart(e.target.value)}
                  placeholder="Service Start"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="date"
                  value={newBillServiceEnd}
                  onChange={(e) => setNewBillServiceEnd(e.target.value)}
                  placeholder="Service End"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <button
                  onClick={handleAddBill}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Add Bill
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Cycle
          </button>
        </div>
      </div>
    </div>
  );
}

