"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents, formatDateRange } from "@/lib/utils";
import type { Bill, BillSplit, PropertyTenant } from "@/lib/supabase/types";

interface BillSplitTableProps {
  bills: Bill[];
  tenants: PropertyTenant[];
  splits: (BillSplit & {
    property_tenants: { display_name: string; email: string };
  })[];
}

export function BillSplitTable({
  bills,
  tenants,
  splits,
}: BillSplitTableProps) {
  // Build a lookup: tenantId -> billId -> split
  const splitMap = new Map<string, Map<string, BillSplit>>();
  for (const split of splits) {
    if (!splitMap.has(split.tenant_id)) {
      splitMap.set(split.tenant_id, new Map());
    }
    splitMap.get(split.tenant_id)!.set(split.bill_id, split);
  }

  // Get unique tenants that appear in splits
  const tenantIds = Array.from(new Set(splits.map((s) => s.tenant_id)));
  const tenantLookup = new Map(tenants.map((t) => [t.id, t]));

  // Sort tenants alphabetically
  const sortedTenantIds = tenantIds.sort((a, b) => {
    const nameA = tenantLookup.get(a)?.display_name || "";
    const nameB = tenantLookup.get(b)?.display_name || "";
    return nameA.localeCompare(nameB);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bill Split Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10 min-w-[120px]">
                Tenant
              </TableHead>
              {bills.map((bill) => (
                <TableHead key={bill.id} className="text-center min-w-[140px]">
                  <div className="capitalize font-medium">{bill.category}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {bill.provider}
                  </div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {formatCents(bill.amount_cents)}
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center min-w-[100px] font-bold">
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTenantIds.map((tenantId) => {
              const tenant = tenantLookup.get(tenantId);
              let rowTotal = 0;

              return (
                <TableRow key={tenantId}>
                  <TableCell className="sticky left-0 bg-card z-10 font-medium">
                    {tenant?.display_name || "Unknown"}
                  </TableCell>
                  {bills.map((bill) => {
                    const split = splitMap.get(tenantId)?.get(bill.id);
                    const amount = split?.amount_cents || 0;
                    rowTotal += amount;

                    return (
                      <TableCell key={bill.id} className="text-center">
                        <div>{formatCents(amount)}</div>
                        {split && split.person_days > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {split.person_days}d / {split.total_person_days}d
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-bold">
                    {formatCents(rowTotal)}
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Totals row */}
            <TableRow className="border-t-2 font-bold">
              <TableCell className="sticky left-0 bg-card z-10">
                Total
              </TableCell>
              {bills.map((bill) => (
                <TableCell key={bill.id} className="text-center">
                  {formatCents(bill.amount_cents)}
                </TableCell>
              ))}
              <TableCell className="text-center">
                {formatCents(
                  bills.reduce((sum, b) => sum + b.amount_cents, 0)
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
