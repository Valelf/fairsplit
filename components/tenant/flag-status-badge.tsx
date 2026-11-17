import { Badge } from "@/components/ui/badge";
import type { FlagStatus } from "@/lib/supabase/types";

const statusConfig: Record<
  FlagStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  open: { label: "Open", variant: "destructive" },
  under_review: { label: "Under Review", variant: "default" },
  resolved: { label: "Resolved", variant: "secondary" },
  dismissed: { label: "Dismissed", variant: "outline" },
};

interface FlagStatusBadgeProps {
  status: FlagStatus;
}

export function FlagStatusBadge({ status }: FlagStatusBadgeProps) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
