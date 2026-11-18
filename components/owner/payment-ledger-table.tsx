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

export function PaymentLedgerTable({ rows, showProperty = true, showCycle = true }: PaymentLedgerTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {showProperty && <TableHead>Property</TableHead>}
            {showCycle && <TableHead>Cycle</TableHead>}
            <TableHead>Tenant</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Activity</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const outstanding = row.summary.owedCents + row.summary.markedPaidCents;
            return (
              <TableRow key={`${row.cycleId}:${row.propertyTenantId}`}>
                {showProperty && <TableCell className="font-medium">{row.propertyName}</TableCell>}
                {showCycle && (
                  <TableCell>
                    <Link
                      href={`/dashboard/owner/properties/${row.propertyId}/cycles/${row.cycleId}`}
                      className="underline-offset-4 hover:underline focus-visible:underline"
                    >
                      {row.cycleLabel}
                    </Link>
                  </TableCell>
                )}
                <TableCell>{row.tenantName}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCents(row.summary.totalCents)}
                  {outstanding > 0 && outstanding !== row.summary.totalCents && (
                    <span className="block text-xs text-muted-foreground">
                      {formatCents(outstanding)} outstanding
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <PaymentStatusPill status={row.status} />
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {activity(row)}
                  {row.note && row.summary.markedPaidCents > 0 && (
                    <span className="block max-w-xs truncate" title={row.note}>
                      &ldquo;{row.note}&rdquo;
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <PaymentRowActions
                    cycleId={row.cycleId}
                    propertyId={row.propertyId}
                    propertyTenantId={row.propertyTenantId}
                    tenantName={row.tenantName}
                    status={row.status}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
