import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentStatusPill } from "@/components/shared/payment-status-pill";
import { PaymentRowActions } from "@/components/owner/payment-row-actions";
import { formatCents, formatDate } from "@/lib/utils";
import type { LedgerRow } from "@/lib/queries/payments";

interface PaymentLedgerTableProps {
  rows: LedgerRow[];
  showProperty?: boolean;
  showCycle?: boolean;
}

function activity(row: LedgerRow): string {
  if (row.status === "confirmed" && row.confirmedAt) return `Confirmed ${formatDate(row.confirmedAt)}`;
  if (row.markedPaidAt && row.summary.markedPaidCents > 0) return `Marked paid ${formatDate(row.markedPaidAt)}`;
  if (row.dueDate) return `Due ${formatDate(row.dueDate)}`;
  return "";
}

const rowKey = (row: LedgerRow) => `${row.cycleId}:${row.propertyTenantId}`;
const outstandingOf = (row: LedgerRow) => row.summary.owedCents + row.summary.markedPaidCents;

function CycleLink({ row }: { row: LedgerRow }) {
  return (
    <Link
      href={`/dashboard/owner/properties/${row.propertyId}/cycles/${row.cycleId}`}
      className="rounded-sm underline-offset-4 hover:underline focus-visible:underline"
    >
      {row.cycleLabel}
    </Link>
  );
}

function Actions({ row }: { row: LedgerRow }) {
  return (
    <PaymentRowActions
      cycleId={row.cycleId}
      propertyId={row.propertyId}
      propertyTenantId={row.propertyTenantId}
      tenantName={row.tenantName}
      status={row.status}
    />
  );
}

export function PaymentLedgerTable({ rows, showProperty = true, showCycle = true }: PaymentLedgerTableProps) {
  return (
    <>
      {/* Phones: one statement line per share. */}
      <ul className="divide-y rounded-lg border md:hidden">
        {rows.map((row) => {
          const outstanding = outstandingOf(row);
          const context = showProperty ? row.propertyName : "";
          return (
            <li key={rowKey(row)} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.tenantName}</p>
                  {(showCycle || context) && (
                    <p className="truncate text-sm text-muted-foreground">
                      {context}
                      {context && showCycle ? ", " : ""}
                      {showCycle && <CycleLink row={row} />}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="figure text-base font-medium">{formatCents(row.summary.totalCents)}</p>
                  {outstanding > 0 && outstanding !== row.summary.totalCents && (
                    <p className="text-xs text-muted-foreground">
                      <span className="figure">{formatCents(outstanding)}</span> outstanding
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <PaymentStatusPill status={row.status} />
                  {activity(row) && <span className="text-xs text-muted-foreground">{activity(row)}</span>}
                </div>
                <Actions row={row} />
              </div>
              {row.note && row.summary.markedPaidCents > 0 && (
                <p className="break-words rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  &ldquo;{row.note}&rdquo;
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Tablet and up: the ledger table. */}
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {showProperty && <TableHead>Property</TableHead>}
              {showCycle && <TableHead>Cycle</TableHead>}
              <TableHead>Tenant</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Activity</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const outstanding = outstandingOf(row);
              return (
                <TableRow key={rowKey(row)}>
                  {showProperty && <TableCell className="font-medium">{row.propertyName}</TableCell>}
                  {showCycle && (
                    <TableCell>
                      <CycleLink row={row} />
                    </TableCell>
                  )}
                  <TableCell>{row.tenantName}</TableCell>
                  <TableCell className="figure text-right font-medium">
                    {formatCents(row.summary.totalCents)}
                    {outstanding > 0 && outstanding !== row.summary.totalCents && (
                      <span className="block font-sans text-xs font-normal text-muted-foreground">
                        <span className="figure">{formatCents(outstanding)}</span> outstanding
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <PaymentStatusPill status={row.status} />
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {activity(row)}
                    {row.note && row.summary.markedPaidCents > 0 && (
                      <span className="block max-w-xs truncate" title={row.note}>
                        &ldquo;{row.note}&rdquo;
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Actions row={row} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
