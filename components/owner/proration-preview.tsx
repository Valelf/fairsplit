import type { TenantDateChangeRow } from "@/lib/owner/departure";
import { formatCents, formatDateRange } from "@/lib/utils";

interface ProrationPreviewProps {
  rows: TenantDateChangeRow[];
  tenantName: string;
}

/** Before → after table of one tenant's share on each bill affected by a date change. */
export function ProrationPreview({ rows, tenantName }: ProrationPreviewProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
        No existing bills change for {tenantName}.
      </p>
    );
  }
  const beforeTotal = rows.reduce((s, r) => s + r.beforeCents, 0);
  const afterTotal = rows.reduce((s, r) => s + r.afterCents, 0);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {tenantName}&apos;s share on {rows.length} affected bill{rows.length === 1 ? "" : "s"}
      </p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <caption className="sr-only">Share before and after the change</caption>
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="p-2 font-medium">Bill</th>
              <th scope="col" className="p-2 text-right font-medium">Days</th>
              <th scope="col" className="p-2 text-right font-medium">Before</th>
              <th scope="col" className="p-2 text-right font-medium">After</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.billId} className="border-t">
                <td className="p-2">
                  <div>{r.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateRange(r.serviceStart, r.serviceEnd)}
                  </div>
                </td>
                <td className="p-2 text-right tabular-nums">
                  {r.beforeDays} → {r.afterDays}
                </td>
                <td className="p-2 text-right tabular-nums">{formatCents(r.beforeCents)}</td>
                <td className="p-2 text-right font-medium tabular-nums">{formatCents(r.afterCents)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-medium">
              <td className="p-2" colSpan={2}>
                Total
              </td>
              <td className="p-2 text-right tabular-nums">{formatCents(beforeTotal)}</td>
              <td className="p-2 text-right tabular-nums">{formatCents(afterTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Everyone else&apos;s shares on these bills are re-split by person-days too.
      </p>
    </div>
  );
}
