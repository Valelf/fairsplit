import Link from "next/link";
import { CheckCircle2, Plug, Plus } from "lucide-react";
import { billCategoryLabel } from "@/lib/utilities/categories";
import { suggestBill, type PreviousBill } from "@/lib/utilities/suggest";
import { formatCents, formatDateRange } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type ChecklistAccount = {
  id: string;
  category: string;
  provider: string;
  account_number_last4: string | null;
  typical_amount_cents: number | null;
  lastBill: PreviousBill | null;
  /** True when this cycle already has a bill linked to the account. */
  added?: boolean;
};

interface MonthlyBillsChecklistProps {
  propertyId: string;
  cycleId: string;
  accounts: ChecklistAccount[];
  cycle?: { start_date: string | null; end_date: string | null } | null;
  title?: string;
  description?: string;
}

/**
 * "Add this month's bills": one row per active utility account, each linking to a
 * pre-filled new-bill form. Accounts already billed in this cycle show as done.
 */
export function MonthlyBillsChecklist({
  propertyId,
  cycleId,
  accounts,
  cycle = null,
  title = "Add this month's bills",
  description = "Each link opens a bill pre-filled from the account. Check the amount and dates against the real bill.",
}: MonthlyBillsChecklistProps) {
  if (accounts.length === 0) return null;
  const remaining = accounts.filter((a) => !a.added).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Plug className="h-4 w-4 text-primary" aria-hidden="true" />
          {title}
        </CardTitle>
        <CardDescription>
          {remaining === 0 ? "Every utility account has a bill in this cycle." : description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {accounts.map((a) => {
            const s = suggestBill(a, a.lastBill, cycle);
            return (
              <li
                key={a.id}
                className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${a.added ? "bg-muted/40" : ""}`}
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {a.provider}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      · {billCategoryLabel(a.category)}
                      {a.account_number_last4 ? ` · ••••${a.account_number_last4}` : ""}
                    </span>
                  </p>
                  {!a.added && (
                    <p className="font-mono text-sm tabular-nums text-muted-foreground">
                      {s.amount_cents ? `~${formatCents(s.amount_cents)}` : "No amount yet"}
                      {s.service_start && s.service_end
                        ? ` · ${formatDateRange(s.service_start, s.service_end)}`
                        : ""}
                    </p>
                  )}
                </div>
                {a.added ? (
                  <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                    Added
                  </span>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/dashboard/owner/properties/${propertyId}/bills/new?cycleId=${cycleId}&accountId=${a.id}`}
                      aria-label={`Add ${a.provider} bill`}
                    >
                      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                      Add bill
                    </Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
