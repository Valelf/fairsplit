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
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle>Bill split breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Each share is the tenant&apos;s person-days divided by the bill&apos;s total person-days.
        </p>
      </CardHeader>
      <CardContent className="px-0 pb-0 sm:px-0 sm:pb-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="sticky left-0 z-10 min-w-32 bg-muted align-bottom">
                Tenant
              </TableHead>
              {bills.map((bill) => (
                <TableHead key={bill.id} className="min-w-36 py-3 text-right align-bottom">
                  <div className="font-semibold capitalize text-foreground">{bill.category}</div>
                  <div className="font-normal">{bill.provider}</div>
                  <div className="figure font-normal text-foreground">
                    {formatCents(bill.amount_cents)}
                  </div>
                </TableHead>
              ))}
              <TableHead className="min-w-28 text-right align-bottom font-semibold text-foreground">
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
                  <TableCell className="sticky left-0 z-10 bg-card font-medium">
                    {tenant?.display_name || "Unknown"}
                  </TableCell>
                  {bills.map((bill) => {
                    const split = splitMap.get(tenantId)?.get(bill.id);
                    const amount = split?.amount_cents || 0;
                    rowTotal += amount;

                    return (
                      <TableCell key={bill.id} className="text-right">
                        <div className={amount === 0 ? "figure text-muted-foreground" : "figure"}>
                          {formatCents(amount)}
                        </div>
                        {split && split.person_days > 0 && (
                          <div className="figure text-xs text-muted-foreground">
                            {split.person_days} / {split.total_person_days} days
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="figure text-right font-medium">
                    {formatCents(rowTotal)}
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Totals row */}
            <TableRow className="border-t-2 border-foreground/15 bg-accent/60 font-semibold hover:bg-accent/60">
              <TableCell className="sticky left-0 z-10 bg-accent">
                Total
              </TableCell>
              {bills.map((bill) => (
                <TableCell key={bill.id} className="figure text-right">
                  {formatCents(bill.amount_cents)}
                </TableCell>
              ))}
              <TableCell className="figure text-right">
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
