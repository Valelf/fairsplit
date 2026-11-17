"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface FlagsFilterTabsProps {
  propertyId: string;
  currentFilter: string;
}

const filters = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under Review" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

export function FlagsFilterTabs({
  propertyId,
  currentFilter,
}: FlagsFilterTabsProps) {
  return (
    <div className="flex gap-1 rounded-lg border p-1 w-fit">
      {filters.map((filter) => (
        <Link
          key={filter.value}
          href={`/dashboard/owner/properties/${propertyId}/flags?status=${filter.value}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            currentFilter === filter.value
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {filter.label}
        </Link>
      ))}
    </div>
  );
}
