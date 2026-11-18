import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATES: Record<string, { variant: BadgeProps["variant"]; label: string }> = {
  draft: { variant: "outline", label: "Draft" },
  open: { variant: "info", label: "Open" },
  closed: { variant: "secondary", label: "Closed" },
};

/** Billing-cycle status pill (draft / open / closed). */
export function CycleStatePill({ status, className }: { status: string; className?: string }) {
  const s = STATES[status] ?? { variant: "outline" as const, label: status };
  return (
    <Badge variant={s.variant} className={cn("capitalize", className)}>
      {s.label}
    </Badge>
  );
}
