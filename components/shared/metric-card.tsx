import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricTone = "default" | "positive" | "attention" | "negative" | "info";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  /** Colours the figure to signal state (e.g. collected vs outstanding). */
  tone?: MetricTone;
  className?: string;
}

const toneClass: Record<MetricTone, string> = {
  default: "text-foreground",
  positive: "text-success",
  attention: "text-warning-soft-foreground",
  negative: "text-destructive",
  info: "text-info-soft-foreground",
};

/** A statement line: small label, big tabular figure, optional note. */
export function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  tone = "default",
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("flex flex-col gap-2 p-4 sm:p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && (
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground"
          >
            {icon}
          </span>
        )}
      </div>
      <p className={cn("figure text-2xl font-medium leading-none tracking-tight sm:text-3xl", toneClass[tone])}>
        {value}
      </p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {trend && (
        <p
          className={cn(
            "figure text-xs",
            trend.value >= 0 ? "text-success" : "text-destructive"
          )}
        >
          {trend.value >= 0 ? "+" : ""}
          {trend.value}% {trend.label}
        </p>
      )}
    </Card>
  );
}
