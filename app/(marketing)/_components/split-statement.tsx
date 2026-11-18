import { cn } from "@/lib/utils";

export interface StatementResident {
  name: string;
  /** First day present, 0-based index into the bill's days. */
  from: number;
  /** Last day present, inclusive. */
  to: number;
  /** Share in cents. */
  shareCents: number;
  note?: string;
}

interface SplitStatementProps {
  provider: string;
  periodLabel: string;
  totalCents: number;
  days: number;
  /** Labels placed under the day grid: [dayIndex, label]. */
  axis: [number, string][];
  residents: StatementResident[];
  footnote?: React.ReactNode;
  className?: string;
}

const usd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

/**
 * A utility bill drawn as a person-days grid: one row per tenant, one cell per
 * day of the billing period. Filled cells are the days each person is charged for.
 */
export function SplitStatement({
  provider,
  periodLabel,
  totalCents,
  days,
  axis,
  residents,
  footnote,
  className,
}: SplitStatementProps) {
  const personDays = residents.reduce((sum, r) => sum + (r.to - r.from + 1), 0);
  const ratePerDay = totalCents / personDays;
  const dayIndexes = Array.from({ length: days }, (_, i) => i);

  return (
    <figure
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-2xl shadow-rail/10 sm:p-6",
        className
      )}
    >
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-dashed pb-4">
        <span className="flex flex-col">
          <span className="font-semibold">{provider}</span>
          <span className="figure text-xs text-muted-foreground">{periodLabel}</span>
        </span>
        <span className="figure text-2xl font-medium">{usd(totalCents)}</span>
      </figcaption>

      <p className="figure mt-4 text-xs text-muted-foreground">
        {personDays} person-days · {usd(ratePerDay)} per person-day
      </p>

      <table className="mt-3 w-full border-separate border-spacing-y-2 text-sm">
        <caption className="sr-only">
          Each tenant&apos;s days in the house and their share of the {provider} bill
        </caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Tenant</th>
            <th scope="col">Days present</th>
            <th scope="col">Days</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {residents.map((r, row) => {
            const count = r.to - r.from + 1;
            return (
              <tr key={r.name}>
                <th scope="row" className="w-16 pr-2 text-left align-middle font-medium sm:w-20">
                  {r.name}
                </th>
                <td className="align-middle">
                  <div
                    aria-hidden="true"
                    className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-px"
                  >
                    {dayIndexes.map((d) => {
                      const present = d >= r.from && d <= r.to;
                      return (
                        <span
                          key={d}
                          className={cn(
                            "h-4 origin-bottom rounded-[0.125rem] motion-safe:animate-cell-in",
                            present ? "bg-primary" : "bg-muted"
                          )}
                          style={{ animationDelay: `${150 + d * 18 + row * 40}ms` }}
                        />
                      );
                    })}
                  </div>
                  {r.note && <p className="mt-1 text-xs text-muted-foreground">{r.note}</p>}
                  <span className="sr-only">
                    {count} of {days} days
                  </span>
                </td>
                <td className="figure hidden w-12 pl-3 text-right align-middle text-xs text-muted-foreground sm:table-cell">
                  {count}d
                </td>
                <td className="figure w-16 pl-3 text-right align-middle font-medium">
                  {usd(r.shareCents)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div aria-hidden="true" className="relative ml-16 mr-16 h-4 sm:ml-20 sm:mr-28">
        {axis.map(([day, label]) => (
          <span
            key={label}
            className={cn(
              "figure absolute top-0 whitespace-nowrap text-xs text-muted-foreground",
              day === 0 ? "left-0" : day >= days - 1 ? "right-0" : "-translate-x-1/2"
            )}
            style={day > 0 && day < days - 1 ? { left: `${(day / days) * 100}%` } : undefined}
          >
            {label}
          </span>
        ))}
      </div>

      {footnote && (
        <div className="mt-4 border-t border-dashed pt-4 text-sm text-muted-foreground">
          {footnote}
        </div>
      )}
    </figure>
  );
}
