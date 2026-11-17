"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlagStatusBadge } from "@/components/tenant/flag-status-badge";
import { FlagResolveDialog } from "@/components/owner/flag-resolve-dialog";
import { FlagDismissDialog } from "@/components/owner/flag-dismiss-dialog";
import { markFlagUnderReview } from "@/lib/actions/flags";
import { formatCents } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Eye, Loader2 } from "lucide-react";
import { useState } from "react";
import type { FlagStatus } from "@/lib/supabase/types";

interface FlagCardProps {
  flag: {
    id: string;
    bill_id: string;
    property_id: string;
    reason: string;
    suggested_amount_cents: number | null;
    resolved_amount_cents: number | null;
    status: FlagStatus;
    resolution_note: string | null;
    created_at: string;
    bills: { category: string; provider: string; amount_cents: number } | null;
    property_tenants: { display_name: string; email: string } | null;
  };
}

export function FlagCard({ flag }: FlagCardProps) {
  const [reviewing, setReviewing] = useState(false);

  async function handleMarkUnderReview() {
    setReviewing(true);
    await markFlagUnderReview(flag.id);
    setReviewing(false);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base capitalize">
              {flag.bills?.category} - {flag.bills?.provider}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Flagged by {flag.property_tenants?.display_name} &middot;{" "}
              {formatDistanceToNow(new Date(flag.created_at), { addSuffix: true })}
            </p>
          </div>
          <FlagStatusBadge status={flag.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium">Reason</p>
          <p className="text-sm text-muted-foreground">{flag.reason}</p>
        </div>

        <div className="flex gap-4 text-sm">
          <div>
            <span className="font-medium">Current Amount: </span>
            <span>{formatCents(flag.bills?.amount_cents || 0)}</span>
          </div>
          {flag.suggested_amount_cents && (
            <div>
              <span className="font-medium">Suggested: </span>
              <span>{formatCents(flag.suggested_amount_cents)}</span>
            </div>
          )}
        </div>

        {flag.resolution_note && (
          <div>
            <p className="text-sm font-medium">Resolution Note</p>
            <p className="text-sm text-muted-foreground">{flag.resolution_note}</p>
          </div>
        )}

        {flag.resolved_amount_cents && (
          <div className="text-sm">
            <span className="font-medium">Resolved Amount: </span>
            <span>{formatCents(flag.resolved_amount_cents)}</span>
          </div>
        )}

        {(flag.status === "open" || flag.status === "under_review") && (
          <div className="flex gap-2 pt-2">
            {flag.status === "open" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkUnderReview}
                disabled={reviewing}
              >
                {reviewing ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Eye className="mr-2 h-3 w-3" />
                )}
                Mark Under Review
              </Button>
            )}
            <FlagResolveDialog
              flagId={flag.id}
              currentAmountCents={flag.bills?.amount_cents || 0}
              suggestedAmountCents={flag.suggested_amount_cents}
            />
            <FlagDismissDialog flagId={flag.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
