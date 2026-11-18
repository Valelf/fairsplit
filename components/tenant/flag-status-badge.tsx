import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { FlagStatus } from "@/lib/supabase/types";

const statusConfig: Record<
  FlagStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  open: { label: "Open", variant: "danger" },
  under_review: { label: "Under review", variant: "warning" },
  resolved: { label: "Resolved", variant: "success" },
  dismissed: { label: "Dismissed", variant: "outline" },
};

interface FlagStatusBadgeProps {
  status: FlagStatus;
}

export function FlagStatusBadge({ status }: FlagStatusBadgeProps) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
