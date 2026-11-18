import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { getCompStatus, isCompForever } from "@/lib/admin/comp";

export function formatCompUntil(compUntil: string): string {
  return isCompForever(compUntil) ? "no end date" : formatDate(compUntil);
}

interface CompStatusBadgeProps {
  planName: string;
  compUntil: string | null | undefined;
  today?: string;
}

/** "Founding plan · free until <date>" style label for a subscription. */
export function CompStatusBadge({ planName, compUntil, today }: CompStatusBadgeProps) {
  const status = getCompStatus(compUntil, today);
  switch (status.kind) {
    case "forever":
      return <Badge variant="success">Founding plan, free with no end date</Badge>;
    case "active":
      return <Badge variant="success">Founding plan, free until {formatDate(status.until)}</Badge>;
    case "expired":
      return <Badge variant="warning">{planName}, comp ended {formatDate(status.until)}</Badge>;
    default:
      return <Badge variant="info">{planName}, paid</Badge>;
  }
}
