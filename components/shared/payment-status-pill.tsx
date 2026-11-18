import { AlertCircle, CheckCircle2, Circle, Clock } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PAYMENT_STATUS_LABELS, type DisplayPaymentStatus } from "@/lib/payments";

const VARIANTS: Record<DisplayPaymentStatus, { variant: BadgeProps["variant"]; icon: React.ElementType }> = {
  owed: { variant: "outline", icon: Circle },
  marked_paid: { variant: "secondary", icon: Clock },
  confirmed: { variant: "default", icon: CheckCircle2 },
  overdue: { variant: "destructive", icon: AlertCircle },
};

interface PaymentStatusPillProps {
  status: DisplayPaymentStatus;
  className?: string;
}

export function PaymentStatusPill({ status, className }: PaymentStatusPillProps) {
  const { variant, icon: Icon } = VARIANTS[status];
  return (
    <Badge variant={variant} className={cn("gap-1 whitespace-nowrap", className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
