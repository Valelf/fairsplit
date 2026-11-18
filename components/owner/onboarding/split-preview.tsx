import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { describeShare } from "@/lib/onboarding/steps";
import { formatCents, formatDateRange } from "@/lib/utils";

export interface SplitPreviewRow {
  name: string;
  personDays: number;
  totalPersonDays: number;
  amountCents: number;
}

interface SplitPreviewProps {
  provider: string;
  category: string;
  amountCents: number;
  serviceStart: string;
  serviceEnd: string;
  rows: SplitPreviewRow[];
}

/** Shows how one bill was split by person-days, with the math spelled out (organism). */
export function SplitPreview({ provider, category, amountCents, serviceStart, serviceEnd, rows }: SplitPreviewProps) {
  const total = rows[0]?.totalPersonDays ?? 0;
  return (
    <section aria-labelledby="split-preview-title" className="space-y-3">
      <div>
        <h2 id="split-preview-title" className="font-semibold">
          {provider} <span className="font-normal capitalize text-muted-foreground">({category})</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          {formatCents(amountCents)} for {formatDateRange(serviceStart, serviceEnd)}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
          No one lived in the house during these dates, so nothing was split. Add tenants whose move-in
          date falls in the bill period and the split is worked out automatically for new bills.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Each person-day is one tenant living there for one day. Between them, your tenants lived there
            for <strong className="text-foreground">{total}</strong> person-days in this period, so each
            person pays for their own days.
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="hidden sm:table-cell">How it&apos;s worked out</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell>
                      <span className="font-medium">{r.name}</span>
                      <span className="block text-xs text-muted-foreground sm:hidden">
                        {describeShare(r.personDays, r.totalPersonDays, amountCents)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {describeShare(r.personDays, r.totalPersonDays, amountCents)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCents(r.amountCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Total</TableCell>
                  <TableCell className="hidden sm:table-cell" />
                  <TableCell className="text-right tabular-nums">
                    {formatCents(rows.reduce((s, r) => s + r.amountCents, 0))}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Shares are rounded to the cent and always add up to the bill exactly.
          </p>
        </>
      )}
    </section>
  );
}
