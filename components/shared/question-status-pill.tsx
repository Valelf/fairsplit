import { Badge, type BadgeProps } from "@/components/ui/badge";
import { questionStatusLabel } from "@/lib/questions/helpers";
import type { BillQuestionStatus } from "@/lib/supabase/types";

const VARIANT: Record<"owner" | "tenant", Record<BillQuestionStatus, BadgeProps["variant"]>> = {
  owner: { open: "warning", answered: "info", resolved: "secondary" },
  tenant: { open: "info", answered: "warning", resolved: "secondary" },
};

/** Bill-question status, worded for the viewer ("Needs reply" for owners, "Landlord replied" for tenants). */
export function QuestionStatusPill({
  status,
  viewer,
  className,
}: {
  status: BillQuestionStatus;
  viewer: "owner" | "tenant";
  className?: string;
}) {
  return (
    <Badge variant={VARIANT[viewer][status]} className={className}>
      {questionStatusLabel(status, viewer)}
    </Badge>
  );
}
