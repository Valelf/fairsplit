import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/** Parse "YYYY-MM-DD" as UTC midnight; full ISO timestamps are parsed as-is. */
export function parseDateUTC(dateStr: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? new Date(dateStr + "T00:00:00Z") : new Date(dateStr);
}

export function formatDate(dateStr: string): string {
  const date = parseDateUTC(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateRange(start: string, end: string): string {
  const startDate = parseDateUTC(start);
  const endDate = parseDateUTC(end);

  const startMonth = startDate.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const startDay = startDate.getUTCDate();
  const endMonth = endDate.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const endDay = endDate.getUTCDate();
  const year = endDate.getUTCFullYear();

  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}
